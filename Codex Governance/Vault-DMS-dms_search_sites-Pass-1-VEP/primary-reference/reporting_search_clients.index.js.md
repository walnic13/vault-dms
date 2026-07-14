const https = require("https");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ms-client-principal",
};

const ROOT_SITE_REGEX = /^https:\/\/vaulttax\.sharepoint\.com\/sites\/[^/]+\/?$/;

function send(context, status, body) {
  context.res = {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    body,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function errorBody(code, message, status) {
  return {
    error: {
      code,
      message,
      status,
      timestamp: nowIso(),
    },
  };
}

function successBody(data) {
  return {
    data,
    meta: {
      timestamp: nowIso(),
      version: "1.0",
    },
  };
}

function getPrincipal(req) {
  const raw = req.headers["x-ms-client-principal"];
  if (!raw || typeof raw !== "string") return null;

  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function getClaimValue(principal, claimTypes) {
  if (!principal || !Array.isArray(principal.claims)) return null;

  for (const claimType of claimTypes) {
    const match = principal.claims.find((c) => c.typ === claimType);
    if (match && typeof match.val === "string" && match.val.trim() !== "") {
      return match.val.trim();
    }
  }

  return null;
}

function parseBody(req) {
  if (req.body == null) return {};
  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }
  if (typeof req.body === "object") {
    return req.body;
  }
  return {};
}

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function buildKnownError(code, message, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  err.isKnown = true;
  return err;
}

function parseJsonSafe(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function requestUrl(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);

    const req = https.request(
      {
        method: options.method || "GET",
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: url.pathname + url.search,
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers || {},
            body: data,
          });
        });
      }
    );

    req.on("error", reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

function getBearerTokenFromAuthorization(req) {
  const raw = req.headers["authorization"];
  if (!raw || typeof raw !== "string") return null;

  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match && match[1] ? match[1].trim() : null;
}

function getOboInputToken(req) {
  const bearer = getBearerTokenFromAuthorization(req);
  if (bearer) {
    return {
      token: bearer,
      source: "authorization_bearer",
    };
  }

  const tokenStore = req.headers["x-ms-token-aad-access-token"];
  if (typeof tokenStore === "string" && tokenStore.trim() !== "") {
    return {
      token: tokenStore.trim(),
      source: "x-ms-token-aad-access-token",
    };
  }

  return null;
}

async function exchangeGraphToken(oboInputToken) {
  const tenantId = process.env.AAD_TENANT_ID;
  const clientId = process.env.AAD_CLIENT_ID;
  const clientSecret = process.env.AAD_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw buildKnownError(
      "INTERNAL_SERVER_ERROR",
      "Missing required OBO configuration.",
      500
    );
  }

  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    requested_token_use: "on_behalf_of",
    assertion: oboInputToken,
    scope: "https://graph.microsoft.com/.default",
  }).toString();

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const r = await requestUrl(
    tokenUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(form),
      },
    },
    form
  );

  const payload = parseJsonSafe(r.body);

  if (r.statusCode < 200 || r.statusCode >= 300 || !payload || !payload.access_token) {
    const description =
      payload &&
      (payload.error_description || payload.error || payload.error_codes?.join(", "));
    const message = description
      ? `Delegated Graph token exchange failed: ${description}`
      : "Delegated Graph token exchange failed.";

    if (r.statusCode === 400 || r.statusCode === 401 || r.statusCode === 403) {
      throw buildKnownError("FORBIDDEN", message, 403);
    }

    throw buildKnownError("INTERNAL_SERVER_ERROR", message, 500);
  }

  return payload.access_token;
}

async function graphGetJson(url, accessToken) {
  const r = await requestUrl(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const payload = parseJsonSafe(r.body);

  if (r.statusCode >= 200 && r.statusCode < 300) {
    return payload || {};
  }

  const graphMessage =
    payload &&
    payload.error &&
    typeof payload.error.message === "string" &&
    payload.error.message.trim() !== ""
      ? payload.error.message.trim()
      : "Graph request failed.";

  if (r.statusCode === 403) {
    throw buildKnownError("FORBIDDEN", graphMessage, 403);
  }

  if (r.statusCode === 404) {
    throw buildKnownError("NOT_FOUND", graphMessage, 404);
  }

  throw buildKnownError("INTERNAL_SERVER_ERROR", graphMessage, 500);
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    return send(context, 204, "");
  }

  const rawQ =
    req.query && typeof req.query.q === "string"
      ? req.query.q
      : "";

  const q = rawQ.trim();

  if (q.length < 2 || q.length > 100 || q.includes("%") || q.includes("_")) {
    return send(
      context,
      400,
      errorBody(
        "INVALID_REQUEST",
        "The q parameter must be 2 to 100 characters after trimming and must not contain % or _.",
        400
      )
    );
  }

  const principal = getPrincipal(req);
  const oid = getClaimValue(principal, [
    "http://schemas.microsoft.com/identity/claims/objectidentifier",
    "oid",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
  ]);

  if (!oid) {
    return send(
      context,
      401,
      errorBody("UNAUTHORIZED", "Missing or invalid EasyAuth identity.", 401)
    );
  }

  const oboInput = getOboInputToken(req);
  if (!oboInput) {
    return send(
      context,
      401,
      errorBody("UNAUTHORIZED", "Missing delegated token input.", 401)
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      SELECT
        set_config('app.current_user_id', $1, false),
        set_config('request.jwt.claim.sub', $1, false),
        set_config('request.jwt.claim.oid', $1, false)
      `,
      [oid]
    );

    await client.query("SELECT 1");

    const registryQuery = `
      SELECT site_id, site_name
      FROM public.reporting_client_sites
      WHERE is_active = TRUE
        AND site_name ILIKE '%' || $1 || '%'
      ORDER BY site_name ASC, site_id ASC
    `;

    const registryResult = await client.query(registryQuery, [q]);
    const graphToken = await exchangeGraphToken(oboInput.token);

    const visibleClients = [];

    if (registryResult.rows.length > 0) {
      for (const row of registryResult.rows) {
        try {
          await graphGetJson(
            `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(row.site_id)}/drive`,
            graphToken
          );

          visibleClients.push({
            client_key: row.site_id,
            client_label: row.site_name,
          });
        } catch (err) {
          if (err && err.code === "FORBIDDEN") {
            continue;
          }

          if (err && err.code === "NOT_FOUND") {
            continue;
          }

          throw err;
        }
      }
    } else {
      const fallbackSearch = await graphGetJson(
        `https://graph.microsoft.com/v1.0/sites?search=${encodeURIComponent(q)}`,
        graphToken
      );

      const graphRows = Array.isArray(fallbackSearch.value) ? fallbackSearch.value : [];

      for (const row of graphRows) {
        const hostname =
          row &&
          row.siteCollection &&
          typeof row.siteCollection.hostname === "string"
            ? row.siteCollection.hostname
            : "";

        const webUrl = row && typeof row.webUrl === "string" ? row.webUrl.trim() : "";
        const siteId = row && typeof row.id === "string" ? row.id.trim() : "";
        const displayName =
          row && typeof row.displayName === "string" ? row.displayName.trim() : "";

        if (hostname !== "vaulttax.sharepoint.com") {
          continue;
        }

        if (!ROOT_SITE_REGEX.test(webUrl)) {
          continue;
        }

        if (!siteId || !displayName) {
          continue;
        }

        try {
          await graphGetJson(
            `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/drive`,
            graphToken
          );

          visibleClients.push({
            client_key: siteId,
            client_label: displayName,
          });
        } catch (err) {
          if (err && err.code === "FORBIDDEN") {
            continue;
          }

          if (err && err.code === "NOT_FOUND") {
            continue;
          }

          throw err;
        }
      }

      visibleClients.sort((a, b) => {
        const labelCompare = a.client_label.localeCompare(b.client_label);
        if (labelCompare !== 0) return labelCompare;
        return a.client_key.localeCompare(b.client_key);
      });
    }

    await client.query("COMMIT");

    return send(
      context,
      200,
      successBody({
        clients: visibleClients,
      })
    );
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    context.log.error("reporting_search_clients failed", err);

    if (err && err.code === "42501") {
      return send(
        context,
        403,
        errorBody("FORBIDDEN", "You do not have permission to access Reporting client search.", 403)
      );
    }

    if (err && err.isKnown === true && typeof err.status === "number" && typeof err.code === "string") {
      return send(
        context,
        err.status,
        errorBody(err.code, err.message, err.status)
      );
    }

    return send(
      context,
      500,
      errorBody("INTERNAL_SERVER_ERROR", "Failed to search clients.", 500)
    );
  } finally {
    client.release();
  }
};