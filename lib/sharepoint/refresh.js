import { getSupabaseAdmin } from "../supabase/server";
import { parentSchedulerUpsert } from "../needs-material/map";
import { loadSchedulerWorkbook } from "./graph";
import { parseSchedulerRows } from "./parse";

function nowIso() {
  return new Date().toISOString();
}

async function createRefreshHistory(supabase, { refreshType, triggeredBy }) {
  const { data, error } = await supabase
    .from("refresh_history")
    .insert({
      refresh_type: refreshType,
      status: "running",
      started_at: nowIso(),
      triggered_by: triggeredBy || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function completeRefreshHistory(supabase, id, patch) {
  const fullPatch = {
    completed_at: nowIso(),
    ...patch,
  };
  const { data, error } = await supabase
    .from("refresh_history")
    .update(fullPatch)
    .eq("id", id)
    .select("*")
    .single();

  // Allow refresh to succeed before migration 003 is applied.
  if (error && /rows_matching|distinct_work_orders|rows_failed|source_filename|diagnostics/i.test(error.message || "")) {
    const {
      rows_matching,
      distinct_work_orders,
      rows_failed,
      source_filename,
      diagnostics,
      ...basePatch
    } = fullPatch;
    const { data: fallback, error: fallbackError } = await supabase
      .from("refresh_history")
      .update({
        ...basePatch,
        error_message:
          fullPatch.error_message ||
          (diagnostics
            ? `diagnostics pending migration 003: matching=${rows_matching}, distinct=${distinct_work_orders}, failed=${rows_failed}, file=${source_filename}`
            : fullPatch.error_message),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (fallbackError) throw fallbackError;
    return fallback;
  }

  if (error) throw error;
  return data;
}

export async function getLatestRefreshMeta(supabase = getSupabaseAdmin()) {
  const full = await supabase
    .from("refresh_history")
    .select(
      "id, status, started_at, completed_at, source_filename, rows_read, rows_matching, distinct_work_orders, rows_created, rows_updated, rows_archived, rows_failed, error_message, diagnostics"
    )
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    full.error &&
    /rows_matching|distinct_work_orders|rows_failed|source_filename|diagnostics/i.test(
      full.error.message || ""
    )
  ) {
    const { data, error } = await supabase
      .from("refresh_history")
      .select(
        "id, status, started_at, completed_at, rows_read, rows_created, rows_updated, rows_archived, error_message"
      )
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  if (full.error) throw full.error;
  return full.data || null;
}

/**
 * Manual / scheduled SharePoint refresh into needs_material.
 * Preserves owner, follow_up_notes, and all material_lines.
 */
export async function runSharePointRefresh({
  refreshType = "manual",
  triggeredBy = null,
} = {}) {
  const supabase = getSupabaseAdmin();
  const history = await createRefreshHistory(supabase, {
    refreshType,
    triggeredBy,
  });

  const stats = {
    rowsInspected: 0,
    matchingRows: 0,
    distinctWorkOrders: 0,
    inserted: 0,
    updated: 0,
    archived: 0,
    failed: 0,
    blankWoSkipped: 0,
    duplicateWoSkipped: 0,
  };
  let sourceFilename = null;
  let diagnostics = {};

  try {
    const workbook = await loadSchedulerWorkbook();
    sourceFilename = workbook.sourceFilename;

    const parsed = parseSchedulerRows(workbook.values);
    stats.rowsInspected = parsed.rowsInspected;
    stats.matchingRows = parsed.matchingRows;
    stats.distinctWorkOrders = parsed.distinctWorkOrders;
    stats.blankWoSkipped = parsed.diagnostics.blankWoSkipped;
    stats.duplicateWoSkipped = parsed.diagnostics.duplicateWoSkipped;
    stats.failed = parsed.diagnostics.invalidDates.length;
    diagnostics = {
      ...parsed.diagnostics,
      sourceFilename,
    };

    const seenAt = nowIso();
    const presentWorkOrders = new Set();

    for (const record of parsed.records) {
      presentWorkOrders.add(record.work_order);
      const schedulerFields = parentSchedulerUpsert(record, seenAt);

      const { data: existing, error: existingError } = await supabase
        .from("needs_material")
        .select("id, work_order")
        .eq("work_order", record.work_order)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("needs_material")
          .update(schedulerFields)
          .eq("id", existing.id);
        if (updateError) throw updateError;
        stats.updated += 1;
      } else {
        const { error: insertError } = await supabase
          .from("needs_material")
          .insert({
            ...schedulerFields,
            owner: "Unassigned",
            follow_up_notes: "",
          });
        if (insertError) throw insertError;
        stats.inserted += 1;
      }
    }

    // Archive previously imported active rows no longer Need Material.
    const { data: activeRows, error: activeError } = await supabase
      .from("needs_material")
      .select("id, work_order")
      .eq("active", true);
    if (activeError) throw activeError;

    const toArchive = (activeRows || []).filter(
      (row) => !presentWorkOrders.has(row.work_order)
    );
    for (const row of toArchive) {
      const { error: archiveError } = await supabase
        .from("needs_material")
        .update({ active: false })
        .eq("id", row.id);
      if (archiveError) throw archiveError;
      stats.archived += 1;
    }

    const historyRow = await completeRefreshHistory(supabase, history.id, {
      status: "success",
      rows_read: stats.rowsInspected,
      rows_matching: stats.matchingRows,
      distinct_work_orders: stats.distinctWorkOrders,
      rows_created: stats.inserted,
      rows_updated: stats.updated,
      rows_archived: stats.archived,
      rows_failed: stats.failed,
      source_filename: sourceFilename,
      diagnostics,
      error_message: null,
    });

    const { count: activeNeedCount, error: countError } = await supabase
      .from("needs_material")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .eq("production_status", "Need Material");
    if (countError) throw countError;

    return {
      ok: true,
      sourceFilename,
      lastRefreshAt: historyRow.completed_at || seenAt,
      stats: {
        ...stats,
        activeDashboardCount: activeNeedCount || 0,
      },
      diagnostics,
      refreshHistoryId: historyRow.id,
    };
  } catch (error) {
    const message = error?.message || "SharePoint refresh failed";
    diagnostics = {
      ...diagnostics,
      code: error?.code || "REFRESH_FAILED",
      graphCode: error?.graphCode || null,
      status: error?.status || null,
      ...(error?.diagnostics || {}),
    };

    await completeRefreshHistory(supabase, history.id, {
      status: "failed",
      rows_read: stats.rowsInspected,
      rows_matching: stats.matchingRows,
      distinct_work_orders: stats.distinctWorkOrders,
      rows_created: stats.inserted,
      rows_updated: stats.updated,
      rows_archived: stats.archived,
      rows_failed: stats.failed,
      source_filename: sourceFilename,
      diagnostics,
      error_message: message,
    }).catch((historyError) => {
      console.error("Failed to update refresh_history", historyError);
    });

    const wrapped = new Error(message);
    wrapped.code = error?.code || "REFRESH_FAILED";
    wrapped.diagnostics = diagnostics;
    wrapped.stats = stats;
    wrapped.sourceFilename = sourceFilename;
    throw wrapped;
  }
}
