const https = require("https");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ms-client-principal",
};

const SITE_ID_MIN_LENGTH = 10;
const SITE_ID_MAX_LENGTH = 200;
const DMS_ITEM_ID_MIN_LENGTH = 5;
const DMS_ITEM_ID_MAX_LENGTH = 200;

const ALLOWED_BODY_KEYS = ["siteId", "dmsItemId"];

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

function isValidSiteIdFormat(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < SITE_ID_MIN_LENGTH || trimmed.length > SITE_ID_MAX_LENGTH) return false;
  if (trimmed.includes("%") || trimmed.includes("_")) return false;
  return true;
}

function isValidDmsItemIdFormat(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < DMS_ITEM_ID_MIN_LENGTH || trimmed.length > DMS_ITEM_ID_MAX_LENGTH) return false;
  if (trimmed.includes("%") || trimmed.includes("_")) return false;
  return true;
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

  let body;
  try {
    body = parseBody(req);
  } catch {
    return send(
      context,
      400,
      errorBody("INVALID_REQUEST", "Request body must be valid JSON.", 400)
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return send(
      context,
      400,
      errorBody("INVALID_REQUEST", "Request body must be a JSON object.", 400)
    );
  }

  for (const key of Object.keys(body)) {
    if (!ALLOWED_BODY_KEYS.includes(key)) {
      return send(
        context,
        400,
        errorBody(
          "INVALID_REQUEST",
          `Request body contains unexpected field '${key}'. Allowed fields: ${ALLOWED_BODY_KEYS.join(", ")}.`,
          400
        )
      );
    }
  }

  const rawSiteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  if (!isValidSiteIdFormat(rawSiteId)) {
    return send(
      context,
      400,
      errorBody(
        "INVALID_REQUEST",
        "Body field 'siteId' is required and must be 10..200 characters with no '%' or '_'.",
        400
      )
    );
  }
  const siteId = rawSiteId;

  const rawDmsItemId = typeof body.dmsItemId === "string" ? body.dmsItemId.trim() : "";
  if (!isValidDmsItemIdFormat(rawDmsItemId)) {
    return send(
      context,
      400,
      errorBody(
        "INVALID_REQUEST",
        "Body field 'dmsItemId' is required and must be 5..200 characters with no '%' or '_'.",
        400
      )
    );
  }
  const dmsItemId = rawDmsItemId;

  const oboInput = getOboInputToken(req);
  if (!oboInput) {
    return send(
      context,
      401,
      errorBody("UNAUTHORIZED", "Missing delegated token input.", 401)
    );
  }

  try {
    // Stateless read-only resolve: no registry gate, no reporting_folders /
    // reporting_folder_dms_links INSERT, no database. Delegated Graph is the
    // authority; returns the live item identity for a consuming app to anchor.
    // Resolves a folder OR a file (the reference resolved folders only).
    const graphToken = await exchangeGraphToken(oboInput.token);

    let drive;
    try {
      drive = await graphGetJson(
        `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/drive`,
        graphToken
      );
    } catch (err) {
      if (err && (err.code === "FORBIDDEN" || err.code === "NOT_FOUND")) {
        return send(
          context,
          404,
          errorBody("NOT_FOUND", "Client site not found.", 404)
        );
      }
      throw err;
    }

    const driveId = typeof drive.id === "string" ? drive.id : "";
    if (driveId === "") {
      return send(
        context,
        404,
        errorBody("NOT_FOUND", "Client site not found.", 404)
      );
    }

    const driveName = typeof drive.name === "string" ? drive.name : "";

    let item;
    try {
      item = await graphGetJson(
        `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(dmsItemId)}`,
        graphToken
      );
    } catch (err) {
      if (err && (err.code === "FORBIDDEN" || err.code === "NOT_FOUND")) {
        return send(
          context,
          404,
          errorBody("NOT_FOUND", "DMS item not found.", 404)
        );
      }
      throw err;
    }

    const itemId = typeof item.id === "string" ? item.id : "";
    if (itemId === "") {
      return send(
        context,
        404,
        errorBody("NOT_FOUND", "DMS item not found.", 404)
      );
    }

    const type =
      item.folder && typeof item.folder === "object"
        ? "folder"
        : item.file && typeof item.file === "object"
        ? "file"
        : null;
    if (type === null) {
      return send(
        context,
        404,
        errorBody("NOT_FOUND", "DMS item not found.", 404)
      );
    }

    return send(
      context,
      200,
      successBody({
        item: {
          site_id: siteId,
          drive_id: driveId,
          drive_name: driveName,
          item_id: itemId,
          name: typeof item.name === "string" ? item.name : "",
          type,
          web_url: typeof item.webUrl === "string" ? item.webUrl : null,
        },
      })
    );
  } catch (err) {
    context.log.error("dms_resolve_item failed", err);

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
      errorBody("INTERNAL_SERVER_ERROR", "Failed to resolve DMS item.", 500)
    );
  }
};
