import { requireViewer } from "../../../../lib/auth/api";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { listRefreshHistory } from "../../../../lib/sharepoint/refresh";

export const dynamic = "force-dynamic";

function sanitizeErrorSummary(message) {
  if (!message) return null;
  const text = String(message).replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (
    /secret|token|password|api[_ -]?key|bearer |authorization|connectionstring|stack/i.test(
      text
    )
  ) {
    return "Refresh failed. Check server configuration and try again.";
  }
  return text.length > 220 ? `${text.slice(0, 217)}…` : text;
}

function durationMs(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null;
  const ms =
    new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

export async function GET() {
  const { error: authError } = await requireViewer();
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();
    const rows = await listRefreshHistory(40, supabase);

    return Response.json({
      rows: rows.map((row) => ({
        id: row.id,
        refreshType: row.refresh_type,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        activeCount:
          row.distinct_work_orders != null
            ? row.distinct_work_orders
            : null,
        inserted: row.rows_created ?? 0,
        updated: row.rows_updated ?? 0,
        archived: row.rows_archived ?? 0,
        durationMs: durationMs(row.started_at, row.completed_at),
        errorSummary: sanitizeErrorSummary(row.error_message),
      })),
    });
  } catch (error) {
    console.error("GET /api/refresh/history failed", error);
    return Response.json(
      { error: "Failed to load refresh history" },
      { status: 500 }
    );
  }
}
