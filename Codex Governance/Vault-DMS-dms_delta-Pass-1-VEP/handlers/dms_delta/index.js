const https = require("https");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ms-client-principal",
};

const SITE_ID_MIN_LENGTH = 10;
const SITE_ID_MAX_LENGTH = 200;
// The delta cursor round-tripped by the client is Graph's own opaque continuation/deltaLink. Graph
// documents SEVERAL link forms (`?token=`, `?$skiptoken=`/`?$deltatoken=`, and the function form
// `…/root/delta(token='…')`), so rather than parse a single query param we follow Graph's link
// VERBATIM — but only after strictly validating it targets graph.microsoft.com and THIS drive's
// `/root/delta` path (see safeGraphDeltaUrl). The driveId is server-resolved from the caller's
// siteId under OBO, so a client can never steer the server to another drive or host (SSRF-safe).
const DELTA_TOKEN_MAX_LENGTH = 8000;

function send(context, status, body) {
  context.res = {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function errorBody(code, message, status) {
  return { error: { code, message, status, timestamp: nowIso() } };
}

function successBody(data) {
  return { data, meta: { timestamp: nowIso(), version: "1.0" } };
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

// Cheap pre-check on the raw query param (length + string). The SEMANTIC validation — that it is a
// Graph delta URL for this drive — happens in safeGraphDeltaUrl once the driveId is known.
function isValidDeltaTokenFormat(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= DELTA_TOKEN_MAX_LENGTH;
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
          resolve({ statusCode: res.statusCode || 0, headers: res.headers || {}, body: data });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
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
  if (bearer) return { token: bearer, source: "authorization_bearer" };
  const tokenStore = req.headers["x-ms-token-aad-access-token"];
  if (typeof tokenStore === "string" && tokenStore.trim() !== "") {
    return { token: tokenStore.trim(), source: "x-ms-token-aad-access-token" };
  }
  return null;
}

async function exchangeGraphToken(oboInputToken) {
  const tenantId = process.env.AAD_TENANT_ID;
  const clientId = process.env.AAD_CLIENT_ID;
  const clientSecret = process.env.AAD_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw buildKnownError("INTERNAL_SERVER_ERROR", "Missing required OBO configuration.", 500);
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
      payload && (payload.error_description || payload.error || payload.error_codes?.join(", "));
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
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });

  const payload = parseJsonSafe(r.body);
  if (r.statusCode >= 200 && r.statusCode < 300) return payload || {};

  const graphMessage =
    payload && payload.error && typeof payload.error.message === "string" && payload.error.message.trim() !== ""
      ? payload.error.message.trim()
      : "Graph request failed.";

  if (r.statusCode === 403) throw buildKnownError("FORBIDDEN", graphMessage, 403);
  if (r.statusCode === 404) throw buildKnownError("NOT_FOUND", graphMessage, 404);
  throw buildKnownError("INTERNAL_SERVER_ERROR", graphMessage, 500);
}

// SSRF-safe validation of a Graph continuation/deltaLink (from Graph's response OR round-tripped by
// the client). Accepts the link VERBATIM — handling every documented form (`?token=`, `?$skiptoken=`,
// `?$deltatoken=`, and the function form `…/root/delta(token='…')`) — but ONLY if it targets
// graph.microsoft.com over https and THIS drive's `/v1.0/drives/{driveId}/root/delta` path. The
// driveId is server-resolved from the caller's siteId under OBO, so a client can neither point at
// another host nor at a drive they didn't resolve. Returns the normalized URL string, or null.
function safeGraphDeltaUrl(link, driveId) {
  if (typeof link !== "string" || link === "" || link.length > DELTA_TOKEN_MAX_LENGTH) return null;
  let u;
  try {
    u = new URL(link);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== "graph.microsoft.com") return null;
  // Path must be exactly this drive's delta endpoint (query form) or its function form `delta(...)`.
  // `new URL` has already normalized any `.`/`..` segments, so a startsWith-escape is not possible.
  const m = u.pathname.match(/^\/v1\.0\/drives\/([^/]+)\/root\/delta(\(.*\))?$/);
  if (!m) return null;
  let seg;
  try {
    seg = decodeURIComponent(m[1]);
  } catch {
    seg = m[1];
  }
  if (seg !== driveId) return null;
  return u.toString();
}

// Map a delta DriveItem to the change projection. Deleted items carry a `deleted` facet and usually
// only id (+ parentReference); present items mirror the dms_tree projection so the client can patch
// its cached tree in place (reconciled by item_id under parent_id).
function mapDeltaItem(item) {
  if (!item || typeof item.id !== "string" || item.id === "") return null;

  const parentId =
    item.parentReference && typeof item.parentReference.id === "string" ? item.parentReference.id : null;

  if (item.deleted && typeof item.deleted === "object") {
    return { item_id: item.id, parent_id: parentId, deleted: true };
  }

  const base = {
    item_id: item.id,
    parent_id: parentId,
    deleted: false,
    name: typeof item.name === "string" ? item.name : "",
    size: typeof item.size === "number" ? item.size : null,
    date_modified: typeof item.lastModifiedDateTime === "string" ? item.lastModifiedDateTime : null,
    web_url: typeof item.webUrl === "string" ? item.webUrl : null,
  };

  if (item.folder && typeof item.folder === "object") {
    const childCount = typeof item.folder.childCount === "number" ? item.folder.childCount : 0;
    return { ...base, type: "folder", has_children: childCount > 0 };
  }
  if (item.file && typeof item.file === "object") {
    return {
      ...base,
      type: "file",
      mime_type: typeof item.file.mimeType === "string" ? item.file.mimeType : null,
      web_dav_url: typeof item.webDavUrl === "string" ? item.webDavUrl : null,
    };
  }
  // The delta root item (no folder/file facet) — skip; it is not a tree node.
  return null;
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
    return send(context, 401, errorBody("UNAUTHORIZED", "Missing or invalid EasyAuth identity.", 401));
  }

  const rawSiteId = req.query && typeof req.query.siteId === "string" ? req.query.siteId.trim() : "";
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

  // Optional opaque delta token from a prior response. Absent ⇒ initial baseline delta.
  const rawDeltaToken =
    req.query && typeof req.query.deltaToken === "string" ? req.query.deltaToken.trim() : "";
  let deltaToken = null;
  if (rawDeltaToken !== "") {
    if (!isValidDeltaTokenFormat(rawDeltaToken)) {
      return send(
        context,
        400,
        errorBody("INVALID_REQUEST", "Query parameter 'deltaToken' has an invalid format.", 400)
      );
    }
    deltaToken = rawDeltaToken;
  }

  const oboInput = getOboInputToken(req);
  if (!oboInput) {
    return send(context, 401, errorBody("UNAUTHORIZED", "Missing delegated token input.", 401));
  }

  try {
    // Stateless: no DB, no stored cursor. The caller holds the delta token; delegated Graph access is
    // the sole authority (Graph 403/404 → route 404). Resolve the drive from the site (same as dms_tree).
    const graphToken = await exchangeGraphToken(oboInput.token);

    let drive;
    try {
      drive = await graphGetJson(
        `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/drive`,
        graphToken
      );
    } catch (err) {
      if (err && (err.code === "FORBIDDEN" || err.code === "NOT_FOUND")) {
        return send(context, 404, errorBody("NOT_FOUND", "Client site not found.", 404));
      }
      throw err;
    }

    const driveId = typeof drive.id === "string" ? drive.id : "";
    if (driveId === "") {
      return send(context, 404, errorBody("NOT_FOUND", "Client site not found.", 404));
    }

    // Initial page: for a baseline (no token) the server constructs its OWN delta URL with the render
    // projection; Graph carries $select across delta pages. With a token, the client round-tripped
    // Graph's own deltaLink — validate it (host + THIS drive's /root/delta path) before following, so
    // it can neither point elsewhere (SSRF) nor at a drive the caller didn't resolve.
    let nextUrl;
    if (deltaToken === null) {
      nextUrl = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root/delta?$select=id,name,size,lastModifiedDateTime,webUrl,webDavUrl,folder,file,parentReference,deleted`;
    } else {
      nextUrl = safeGraphDeltaUrl(deltaToken, driveId);
      if (!nextUrl) {
        return send(
          context,
          400,
          errorBody("INVALID_REQUEST", "Query parameter 'deltaToken' is not a valid delta cursor for this drive.", 400)
        );
      }
    }

    const changes = [];
    let newToken = null;

    // Page through @odata.nextLink; the final page carries @odata.deltaLink (the next cursor). Both are
    // Graph's own links, followed VERBATIM after safeGraphDeltaUrl validation (handles ?token=,
    // ?$skiptoken=, ?$deltatoken=, and the delta(token='…') function form). Existence-disclosure-safe
    // (API Spec §1): a delegated Graph 403/404 anywhere in the loop — inaccessible drive, or an
    // expired/invalid token (410 falls through to the generic known-error path) — maps to route 404,
    // mirroring dms_tree. The client treats any dms_delta non-2xx as "drop the token and re-baseline".
    try {
      while (nextUrl) {
        const page = await graphGetJson(nextUrl, graphToken);

        const items = Array.isArray(page.value) ? page.value : [];
        for (const raw of items) {
          const mapped = mapDeltaItem(raw);
          if (mapped) changes.push(mapped);
        }

        const nextLink = typeof page["@odata.nextLink"] === "string" ? page["@odata.nextLink"] : "";
        const deltaLink = typeof page["@odata.deltaLink"] === "string" ? page["@odata.deltaLink"] : "";

        if (nextLink) {
          // A malformed/unexpected nextLink (fails validation) ends pagination safely rather than
          // fetching an untrusted URL; the caller re-baselines next call if the set was truncated.
          nextUrl = safeGraphDeltaUrl(nextLink, driveId);
        } else {
          newToken = safeGraphDeltaUrl(deltaLink, driveId);
          nextUrl = null;
        }
      }
    } catch (err) {
      if (err && (err.code === "FORBIDDEN" || err.code === "NOT_FOUND")) {
        return send(context, 404, errorBody("NOT_FOUND", "Client site not found.", 404));
      }
      throw err;
    }

    return send(
      context,
      200,
      successBody({
        dms_delta: {
          site_id: siteId,
          drive_id: driveId,
          // true ⇒ this response is a full baseline (no input token); false ⇒ incremental changes.
          baseline: deltaToken === null,
          changes,
          delta_token: newToken,
        },
      })
    );
  } catch (err) {
    context.log.error("dms_delta failed", err);

    if (err && err.isKnown === true && typeof err.status === "number" && typeof err.code === "string") {
      return send(context, err.status, errorBody(err.code, err.message, err.status));
    }

    return send(context, 500, errorBody("INTERNAL_SERVER_ERROR", "Failed to get DMS delta.", 500));
  }
};
