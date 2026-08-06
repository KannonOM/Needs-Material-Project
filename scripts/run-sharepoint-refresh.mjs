import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(root, true);

const refreshUrl = pathToFileURL(
  path.join(root, "lib", "sharepoint", "refresh.js")
).href;

const { runSharePointRefresh } = await import(refreshUrl);

try {
  const result = await runSharePointRefresh({
    refreshType: "manual",
    triggeredBy: null,
  });
  console.log("REFRESH_OK=true");
  console.log(
    JSON.stringify(
      {
        sourceFilename: result.sourceFilename,
        stats: result.stats,
        diagnostics: {
          headerRowNumber: result.diagnostics?.headerRowNumber,
          normalizedHeadersFound: result.diagnostics?.normalizedHeadersFound,
          blankWoSkipped: result.diagnostics?.blankWoSkipped,
          duplicateWoSkipped: result.diagnostics?.duplicateWoSkipped,
          missingColumns: result.diagnostics?.missingColumns,
          invalidDateCount: (result.diagnostics?.invalidDates || []).length,
        },
      },
      null,
      2
    )
  );
} catch (error) {
  console.log("REFRESH_OK=false");
  console.log("ERROR_CODE=" + (error.code || "UNKNOWN"));
  console.log(
    "ERROR_MESSAGE=" +
      String(error.message || error).replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        "<REDACTED_GUID>"
      )
  );
  if (error.stats) console.log("STATS=" + JSON.stringify(error.stats));
  process.exitCode = 1;
}
