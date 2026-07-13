const https = require("https");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ms-client-principal",
};

const SITE_ID_MIN_LENGTH = 10;
const SITE_ID_MAX_LENGTH = 200;
const PARENT_ITEM_ID_MIN_LENGTH = 5;
const PARENT_ITEM_ID_MAX_LENGTH = 200;

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

function isValidSiteIdFormat(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < SITE_ID_MIN_LENGTH || trimmed.length > SITE_ID_MAX_LENGTH) return false;
  if (trimmed.includes("%") || trimmed.includes("_")) return false;
  return true;
}

function isValidParentItemIdFormat(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < PARENT_ITEM_ID_MIN_LENGTH || trimmed.length > PARENT_ITEM_ID_MAX_LENGTH) return false;
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

// Enumerate the immediate children of a drive node — FILES AND FOLDERS — projecting
// the fields the SharePoint-identical explorer renders (Name / Date modified / Type /
// Size). All fields come from the standard DriveItem in the /children response; the
// same Graph endpoint the reference handler already calls (folders-only there).
async function enumerateImmediateChildren(driveId, parentItemId, accessToken) {
  const children = [];
  let nextUrl = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(parentItemId)}/children`;

  while (nextUrl) {
    let page;
    try {
      page = await graphGetJson(nextUrl, accessToken);
    } catch (err) {
      if (err && (err.code === "FORBIDDEN" || err.code === "NOT_FOUND")) {
        return children;
      }
      throw err;
    }

    const items = Array.isArray(page.value) ? page.value : [];
    for (const item of items) {
      if (!item || typeof item.id !== "string" || item.id === "") continue;

      const base = {
        item_id: item.id,
        name: typeof item.name === "string" ? item.name : "",
        size: typeof item.size === "number" ? item.size : null,
        date_modified:
          typeof item.lastModifiedDateTime === "string" ? item.lastModifiedDateTime : null,
        web_url: typeof item.webUrl === "string" ? item.webUrl : null,
      };

      if (item.folder && typeof item.folder === "object") {
        const childCount =
          typeof item.folder.childCount === "number" ? item.folder.childCount : 0;
        children.push({
          ...base,
          type: "folder",
          has_children: childCount > 0,
        });
      } else if (item.file && typeof item.file === "object") {
        const mimeType =
          typeof item.file.mimeType === "string" ? item.file.mimeType : null;
        children.push({
          ...base,
          type: "file",
          mime_type: mimeType,
        });
      }
    }

    nextUrl =
      typeof page["@odata.nextLink"] === "string" && page["@odata.nextLink"].trim() !== ""
        ? page["@odata.nextLink"]
        : null;
  }

  return children;
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

  const rawSiteId =
    req.query && typeof req.query.siteId === "string" ? req.query.siteId.trim() : "";
  if (!isValidSiteIdFormat(rawSiteId)) {
    return send(
      context,
      400,
      errorBody(
        "INVALID_REQUEST",
        "Query parameter 'siteId' is required and must be 10..200 characters with no '%' or '_'.",
        400
      )
    );
  }
  const siteId = rawSiteId;

  const rawParentItemId =
    req.query && typeof req.query.parentItemId === "string" ? req.query.parentItemId.trim() : "";
  let parentItemId = null;
  if (rawParentItemId !== "") {
    if (!isValidParentItemIdFormat(rawParentItemId)) {
      return send(
        context,
        400,
        errorBody(
          "INVALID_REQUEST",
          "Query parameter 'parentItemId' must be 5..200 characters with no '%' or '_'.",
          400
        )
      );
    }
    parentItemId = rawParentItemId;
  }

  const oboInput = getOboInputToken(req);
  if (!oboInput) {
    return send(
      context,
      401,
      errorBody("UNAUTHORIZED", "Missing delegated token input.", 401)
    );
  }

  try {
    // Stateless: no registry gate, no database. Delegated Graph access is the sole
    // site authority (Graph 403/404 -> route 404). No site-label lookup — the caller
    // carries the site name from dms_search_sites — so no /sites/{id} call is needed.
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

    let parent;
    if (parentItemId === null) {
      let root;
      try {
        root = await graphGetJson(
          `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root`,
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

      const rootItemId = typeof root.id === "string" ? root.id : "";
      if (rootItemId === "") {
        return send(
          context,
          404,
          errorBody("NOT_FOUND", "Client site not found.", 404)
        );
      }

      parent = {
        item_id: rootItemId,
        name:
          typeof root.name === "string" && root.name !== ""
            ? root.name
            : typeof drive.name === "string"
            ? drive.name
            : "",
        type: "folder",
      };
    } else {
      let item;
      try {
        item = await graphGetJson(
          `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(parentItemId)}`,
          graphToken
        );
      } catch (err) {
        if (err && (err.code === "FORBIDDEN" || err.code === "NOT_FOUND")) {
          return send(
            context,
            404,
            errorBody("NOT_FOUND", "Parent item not found.", 404)
          );
        }
        throw err;
      }

      if (!item || !item.folder || typeof item.folder !== "object") {
        return send(
          context,
          404,
          errorBody("NOT_FOUND", "Parent item not found.", 404)
        );
      }

      const itemId = typeof item.id === "string" ? item.id : "";
      if (itemId === "") {
        return send(
          context,
          404,
          errorBody("NOT_FOUND", "Parent item not found.", 404)
        );
      }

      parent = {
        item_id: itemId,
        name: typeof item.name === "string" ? item.name : "",
        type: "folder",
      };
    }

    const children = await enumerateImmediateChildren(
      driveId,
      parent.item_id,
      graphToken
    );

    // Folders first, then files; alphabetical within each (explorer convention).
    children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      return a.item_id.localeCompare(b.item_id);
    });

    return send(
      context,
      200,
      successBody({
        dms_tree: {
          site_id: siteId,
          drive_id: driveId,
          parent: parent,
          children: children,
        },
      })
    );
  } catch (err) {
    context.log.error("dms_tree failed", err);

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
      errorBody("INTERNAL_SERVER_ERROR", "Failed to get DMS tree.", 500)
    );
  }
};
