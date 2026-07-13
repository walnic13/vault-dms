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

function sendJson(context, status, body) {
  context.res = {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    body,
  };
}

function sendBinary(context, status, bodyBuffer, extraHeaders = {}) {
  context.res = {
    status,
    isRaw: true,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
    },
    body: bodyBuffer,
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

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function parseJsonSafe(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildKnownError(code, message, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  err.isKnown = true;
  return err;
}

function requestText(urlStr, options = {}, body = null) {
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

function requestBinary(urlStr, options = {}) {
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
        const chunks = [];
        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers || {},
            body: Buffer.concat(chunks),
          });
        });
      }
    );

    req.on("error", reject);
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

  const r = await requestText(
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

    if (r.statusCode === 400 || r.statusCode === 401) {
      throw buildKnownError("UNAUTHORIZED", message, 401);
    }

    if (r.statusCode === 403) {
      throw buildKnownError("FORBIDDEN", message, 403);
    }

    throw buildKnownError("INTERNAL_SERVER_ERROR", message, 500);
  }

  return payload.access_token;
}

async function graphGetContentRedirect(driveId, itemId, accessToken) {
  const r = await requestText(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (r.statusCode === 302) {
    const location = r.headers.location;
    if (typeof location === "string" && location.trim() !== "") {
      return {
        location: location.trim(),
        headers: r.headers || {},
      };
    }

    throw buildKnownError(
      "INTERNAL_SERVER_ERROR",
      "Graph content response did not include redirect location.",
      500
    );
  }

  const payload = parseJsonSafe(r.body);
  const graphMessage =
    payload &&
    payload.error &&
    typeof payload.error.message === "string" &&
    payload.error.message.trim() !== ""
      ? payload.error.message.trim()
      : "Graph content request failed.";

  if (r.statusCode === 401) {
    throw buildKnownError("UNAUTHORIZED", graphMessage, 401);
  }

  if (r.statusCode === 403) {
    throw buildKnownError("FORBIDDEN", graphMessage, 403);
  }

  if (r.statusCode === 404) {
    throw buildKnownError("NOT_FOUND", graphMessage, 404);
  }

  throw buildKnownError("INTERNAL_SERVER_ERROR", graphMessage, 500);
}

async function fetchDownloadPayload(downloadUrl) {
  const r = await requestBinary(downloadUrl, { method: "GET" });

  if (r.statusCode < 200 || r.statusCode >= 300) {
    throw buildKnownError(
      "INTERNAL_SERVER_ERROR",
      "Failed to download file from SharePoint content URL.",
      500
    );
  }

  return r;
}

function buildAttachmentDisposition(headers, fallbackName = "download") {
  const existing = headers["content-disposition"];
  if (typeof existing === "string" && existing.trim() !== "") {
    return existing;
  }

  return `attachment; filename="${fallbackName}"`;
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    return sendJson(context, 204, "");
  }

  const principal = getPrincipal(req);
  const oid = getClaimValue(principal, [
    "http://schemas.microsoft.com/identity/claims/objectidentifier",
    "oid",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
  ]);

  if (!oid) {
    return sendJson(
      context,
      401,
      errorBody("UNAUTHORIZED", "Missing or invalid EasyAuth identity.", 401)
    );
  }

  const rawId = req.query && typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!isUuid(rawId)) {
    return sendJson(
      context,
      400,
      errorBody("INVALID_REQUEST", "Query parameter 'id' must be a valid UUID.", 400)
    );
  }

  const oboInput = getOboInputToken(req);
  if (!oboInput) {
    return sendJson(
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

    const linkResult = await client.query(
      `
      SELECT drive_id, dms_item_id
      FROM reporting_folder_dms_links
      WHERE id = $1
      `,
      [rawId]
    );

    if (linkResult.rowCount !== 1) {
      await client.query("ROLLBACK");
      return sendJson(
        context,
        404,
        errorBody("NOT_FOUND", "DMS link not found.", 404)
      );
    }

    const { drive_id: driveId, dms_item_id: itemId } = linkResult.rows[0];

    const graphToken = await exchangeGraphToken(oboInput.token);
    const redirect = await graphGetContentRedirect(driveId, itemId, graphToken);

    await client.query("COMMIT");

    const fileResponse = await fetchDownloadPayload(redirect.location);

    const contentType =
      typeof fileResponse.headers["content-type"] === "string" &&
      fileResponse.headers["content-type"].trim() !== ""
        ? fileResponse.headers["content-type"]
        : "application/octet-stream";

    const contentDisposition = buildAttachmentDisposition(fileResponse.headers);
    const contentLength =
      typeof fileResponse.headers["content-length"] === "string"
        ? fileResponse.headers["content-length"]
        : String(fileResponse.body.length);

    return sendBinary(context, 200, fileResponse.body, {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "Content-Length": contentLength,
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    context.log.error("reporting_download_dms_item failed", err);

    if (err && err.code === "42501") {
      return sendJson(
        context,
        403,
        errorBody("FORBIDDEN", "You do not have permission to access this DMS link.", 403)
      );
    }

    if (err && err.isKnown === true && typeof err.status === "number" && typeof err.code === "string") {
      return sendJson(
        context,
        err.status,
        errorBody(err.code, err.message, err.status)
      );
    }

    return sendJson(
      context,
      500,
      errorBody("INTERNAL_SERVER_ERROR", "Failed to download DMS item.", 500)
    );
  } finally {
    client.release();
  }
};