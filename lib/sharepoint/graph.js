const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

export function getSharePointConfig() {
  return {
    tenantId: requiredEnv("MICROSOFT_TENANT_ID"),
    clientId: requiredEnv("MICROSOFT_CLIENT_ID"),
    clientSecret: requiredEnv("MICROSOFT_CLIENT_SECRET"),
    hostname: requiredEnv("SHAREPOINT_HOSTNAME"),
    sitePath: requiredEnv("SHAREPOINT_SITE_PATH").replace(/\/$/, ""),
    filePath: requiredEnv("SHAREPOINT_FILE_PATH").replace(/^\/+/, ""),
  };
}

export async function getGraphAccessToken(config = getSharePointConfig()) {
  const url = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = payload.error || response.status;
    const desc = payload.error_description || "token request failed";
    const err = new Error(`Graph authentication failed (${code}): ${desc}`);
    err.code = "GRAPH_AUTH";
    err.status = response.status;
    throw err;
  }
  if (!payload.access_token) {
    const err = new Error("Graph authentication failed: access token missing");
    err.code = "GRAPH_AUTH";
    throw err;
  }
  return payload.access_token;
}

async function graphFetch(token, path, init = {}) {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const graphCode = payload?.error?.code || String(response.status);
    const graphMessage =
      payload?.error?.message ||
      payload?.error_description ||
      text ||
      "Graph request failed";
    const err = new Error(
      `Microsoft Graph error (${graphCode}): ${graphMessage}`
    );
    err.code =
      response.status === 401 || response.status === 403
        ? "GRAPH_PERMISSION"
        : "GRAPH_REQUEST";
    err.status = response.status;
    err.graphCode = graphCode;
    throw err;
  }

  return payload;
}

export async function resolveSiteId(token, config = getSharePointConfig()) {
  const sitePath = config.sitePath.startsWith("/")
    ? config.sitePath
    : `/${config.sitePath}`;
  // GET /sites/{hostname}:/{server-relative-path}
  const data = await graphFetch(
    token,
    `/sites/${config.hostname}:${sitePath}`
  );
  if (!data?.id) {
    const err = new Error("SharePoint site not found");
    err.code = "SITE_NOT_FOUND";
    throw err;
  }
  return data.id;
}

export async function resolveDriveItem(token, siteId, config = getSharePointConfig()) {
  const path = config.filePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  const data = await graphFetch(token, `/sites/${siteId}/drive/root:/${path}`);
  if (!data?.id) {
    const err = new Error(
      `SharePoint workbook not found at ${config.filePath}`
    );
    err.code = "FILE_NOT_FOUND";
    throw err;
  }
  return {
    id: data.id,
    name: data.name || config.filePath.split("/").pop(),
    webUrl: data.webUrl || null,
  };
}

export async function readWorksheetUsedRange(
  token,
  siteId,
  itemId,
  worksheetName
) {
  const encodedName = encodeURIComponent(worksheetName);
  try {
    return await graphFetch(
      token,
      `/sites/${siteId}/drive/items/${itemId}/workbook/worksheets('${encodedName}')/usedRange(valuesOnly=true)`
    );
  } catch (error) {
    const message = String(error.message || "").toLowerCase();
    const graphCode = String(error.graphCode || "").toLowerCase();
    if (
      error.status === 404 ||
      graphCode.includes("itemnotfound") ||
      message.includes("worksheet")
    ) {
      const err = new Error(
        `Worksheet "${worksheetName}" was not found in the workbook`
      );
      err.code = "MISSING_WORKSHEET";
      throw err;
    }
    throw error;
  }
}

export async function loadSchedulerWorkbook() {
  const config = getSharePointConfig();
  const token = await getGraphAccessToken(config);
  const siteId = await resolveSiteId(token, config);
  const item = await resolveDriveItem(token, siteId, config);
  const usedRange = await readWorksheetUsedRange(
    token,
    siteId,
    item.id,
    "Scheduler 2026"
  );
  return {
    sourceFilename: item.name,
    values: Array.isArray(usedRange?.values) ? usedRange.values : [],
  };
}
