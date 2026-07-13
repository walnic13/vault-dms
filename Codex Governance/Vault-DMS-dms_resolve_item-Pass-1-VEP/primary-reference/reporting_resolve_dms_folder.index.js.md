const https = require("https");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
});

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

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
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

    const lookupResult = await client.query(
      `
      SELECT site_id, site_name
      FROM public.reporting_client_sites
      WHERE site_id = $1
        AND is_active = TRUE
      `,
      [siteId]
    );

    if (lookupResult.rowCount !== 1) {
      await client.query("ROLLBACK");
      return send(
        context,
        404,
        errorBody("NOT_FOUND", "Client site not found.", 404)
      );
    }

    const registryRow = lookupResult.rows[0];

    const graphToken = await exchangeGraphToken(oboInput.token);

    let drive;
    try {
      drive = await graphGetJson(
        `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(registryRow.site_id)}/drive`,
        graphToken
      );
    } catch (err) {
      if (err && (err.code === "FORBIDDEN" || err.code === "NOT_FOUND")) {
        await client.query("ROLLBACK");
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
      await client.query("ROLLBACK");
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
        await client.query("ROLLBACK");
        return send(
          context,
          404,
          errorBody("NOT_FOUND", "DMS item not found.", 404)
        );
      }
      throw err;
    }

    if (!item || !item.folder || typeof item.folder !== "object") {
      await client.query("ROLLBACK");
      return send(
        context,
        404,
        errorBody("NOT_FOUND", "DMS item not found.", 404)
      );
    }

    const itemId = typeof item.id === "string" ? item.id : "";
    if (itemId === "") {
      await client.query("ROLLBACK");
      return send(
        context,
        404,
        errorBody("NOT_FOUND", "DMS item not found.", 404)
      );
    }

    const folderName = typeof item.name === "string" ? item.name.trim() : "";
    if (folderName === "") {
      await client.query("ROLLBACK");
      return send(
        context,
        500,
        errorBody("INTERNAL_SERVER_ERROR", "Resolved DMS item has no name.", 500)
      );
    }

    let folderResult;
    let linkResult;
    let registration;

    await client.query("SAVEPOINT before_link_insert");

    try {
      const folderInsert = await client.query(
        `
        INSERT INTO public.reporting_folders (folder_name, created_by)
        VALUES ($1, $2)
        RETURNING id, folder_name, created_by, created_at, updated_at
        `,
        [folderName, oid]
      );

      const newFolderRow = folderInsert.rows[0];

      const linkInsert = await client.query(
        `
        INSERT INTO public.reporting_folder_dms_links
          (folder_id, site_name, drive_id, drive_name, dms_item_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING site_name, drive_id, drive_name, dms_item_id
        `,
        [
          newFolderRow.id,
          registryRow.site_name,
          driveId,
          driveName,
          dmsItemId,
          oid,
        ]
      );

      await client.query("RELEASE SAVEPOINT before_link_insert");

      folderResult = newFolderRow;
      linkResult = linkInsert.rows[0];
      registration = "created";
    } catch (insertErr) {
      if (
        insertErr &&
        insertErr.code === "23505" &&
        insertErr.constraint === "reporting_folder_dms_links_drive_item_unique"
      ) {
        await client.query("ROLLBACK TO SAVEPOINT before_link_insert");

        const racedLink = await client.query(
          `
          SELECT folder_id
          FROM public.reporting_folder_dms_links
          WHERE drive_id = $1 AND dms_item_id = $2
          `,
          [driveId, dmsItemId]
        );

        if (racedLink.rowCount !== 1) {
          throw insertErr;
        }

        const racedFolderId = racedLink.rows[0].folder_id;

        const racedFolderSelect = await client.query(
          `
          SELECT id, folder_name, created_by, created_at, updated_at
          FROM public.reporting_folders
          WHERE id = $1
          `,
          [racedFolderId]
        );

        const racedLinkSelect = await client.query(
          `
          SELECT site_name, drive_id, drive_name, dms_item_id
          FROM public.reporting_folder_dms_links
          WHERE folder_id = $1
          `,
          [racedFolderId]
        );

        if (racedFolderSelect.rowCount !== 1 || racedLinkSelect.rowCount !== 1) {
          throw insertErr;
        }

        folderResult = racedFolderSelect.rows[0];
        linkResult = racedLinkSelect.rows[0];
        registration = "reused";
      } else {
        throw insertErr;
      }
    }

    await client.query("COMMIT");

    return send(
      context,
      200,
      successBody({
        folder: {
          id: folderResult.id,
          folder_name: folderResult.folder_name,
          created_by: folderResult.created_by,
          created_at:
            folderResult.created_at instanceof Date
              ? folderResult.created_at.toISOString()
              : folderResult.created_at,
          updated_at:
            folderResult.updated_at instanceof Date
              ? folderResult.updated_at.toISOString()
              : folderResult.updated_at,
          dms_link: {
            site_name: linkResult.site_name,
            drive_id: linkResult.drive_id,
            drive_name: linkResult.drive_name,
            dms_item_id: linkResult.dms_item_id,
          },
        },
        registration,
      })
    );
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    context.log.error("reporting_resolve_dms_folder failed", err);

    if (err && err.code === "42501") {
      return send(
        context,
        403,
        errorBody("FORBIDDEN", "You do not have permission to resolve this DMS folder.", 403)
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
      errorBody("INTERNAL_SERVER_ERROR", "Failed to resolve DMS folder.", 500)
    );
  } finally {
    client.release();
  }
};
