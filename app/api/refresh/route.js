import { requireRefreshRole } from "../../../lib/auth/api";
import { runSharePointRefresh } from "../../../lib/sharepoint/refresh";

export const dynamic = "force-dynamic";

export async function POST() {
  const { user, error: authError } = await requireRefreshRole();
  if (authError) return authError;

  try {
    const result = await runSharePointRefresh({
      refreshType: "manual",
      triggeredBy: user.id,
    });
    return Response.json(result);
  } catch (error) {
    console.error("POST /api/refresh failed", {
      code: error?.code,
      message: error?.message,
      diagnostics: error?.diagnostics,
    });
    return Response.json(
      {
        ok: false,
        error: error?.message || "SharePoint refresh failed",
        code: error?.code || "REFRESH_FAILED",
        stats: error?.stats || null,
        diagnostics: error?.diagnostics || null,
        sourceFilename: error?.sourceFilename || null,
      },
      { status: error?.code === "GRAPH_PERMISSION" || error?.code === "GRAPH_AUTH" ? 502 : 500 }
    );
  }
}
