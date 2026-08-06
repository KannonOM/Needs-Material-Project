import { requireViewer } from "../../../lib/auth/api";
import { getSupabaseAdmin } from "../../../lib/supabase/server";
import { mapRowFromDb } from "../../../lib/needs-material/map";
import { getLatestRefreshMeta } from "../../../lib/sharepoint/refresh";

export const dynamic = "force-dynamic";

async function loadAllRows(supabase) {
  const { data: parents, error: parentError } = await supabase
    .from("needs_material")
    .select("*")
    .order("due_date", { ascending: true });

  if (parentError) throw parentError;

  const { data: lines, error: lineError } = await supabase
    .from("material_lines")
    .select("*")
    .order("sort_order", { ascending: true });

  if (lineError) throw lineError;

  const byParent = new Map();
  for (const line of lines || []) {
    const list = byParent.get(line.needs_material_id) || [];
    list.push(line);
    byParent.set(line.needs_material_id, list);
  }

  return (parents || []).map((row) =>
    mapRowFromDb(row, byParent.get(row.id) || [])
  );
}

export async function GET() {
  const { error: authError } = await requireViewer();
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();
    // Automatic sample seeding is disabled — live SharePoint import owns data.
    const rows = await loadAllRows(supabase);
    const latestRefresh = await getLatestRefreshMeta(supabase);

    const startedAt = latestRefresh?.started_at || null;
    const completedAt = latestRefresh?.completed_at || null;
    let durationMs = null;
    if (startedAt && completedAt) {
      const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
      if (Number.isFinite(ms) && ms >= 0) durationMs = ms;
    }

    return Response.json({
      rows,
      seeded: false,
      source: "supabase",
      sourceFilename:
        latestRefresh?.source_filename || "Production Scheduler - 2026.xlsx",
      lastRefreshAt: completedAt || startedAt || null,
      lastRefreshStatus: latestRefresh?.status || null,
      // Stats already loaded by getLatestRefreshMeta — exposed for UI only.
      refreshStats: latestRefresh
        ? {
            inserted: latestRefresh.rows_created ?? null,
            updated: latestRefresh.rows_updated ?? null,
            archived: latestRefresh.rows_archived ?? null,
            activeDashboardCount: null,
            durationMs,
            errorMessage: latestRefresh.error_message || null,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/needs-material failed", error);
    return Response.json(
      {
        error: error?.message || "Failed to load needs material rows",
      },
      { status: 500 }
    );
  }
}
