import { requireEditor } from "../../../../lib/auth/api";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import {
  isUuid,
  lineForUpsert,
  mapRowFromDb,
  parentDashboardPatch,
} from "../../../../lib/needs-material/map";

export const dynamic = "force-dynamic";

async function writeAudit(supabase, entries) {
  if (!entries.length) return;
  const { error } = await supabase.from("audit_log").insert(entries);
  if (error) throw error;
}

function str(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

export async function PUT(request, context) {
  const { user, error: authError } = await requireEditor();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return Response.json({ error: "Invalid work order id" }, { status: 400 });
    }

    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: existingParent, error: existingParentError } = await supabase
      .from("needs_material")
      .select("*")
      .eq("id", id)
      .single();

    if (existingParentError) throw existingParentError;

    const { data: existingLines, error: existingLinesError } = await supabase
      .from("material_lines")
      .select("*")
      .eq("needs_material_id", id);

    if (existingLinesError) throw existingLinesError;

    const patch = parentDashboardPatch(body);
    const { data: updatedParent, error: updateError } = await supabase
      .from("needs_material")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    const auditEntries = [];
    for (const field of ["owner", "follow_up_notes"]) {
      if (str(existingParent[field]) !== str(patch[field])) {
        auditEntries.push({
          user_id: user.id,
          action: "update_field",
          record_type: "needs_material",
          record_id: id,
          field_name: field,
          old_value: str(existingParent[field]) || null,
          new_value: str(patch[field]) || null,
        });
      }
    }

    const incomingLines = Array.isArray(body.material_lines)
      ? body.material_lines
      : [];
    const existingById = new Map(
      (existingLines || []).map((line) => [line.id, line])
    );
    const keepIds = new Set();

    for (let index = 0; index < incomingLines.length; index += 1) {
      const incoming = incomingLines[index];
      const payload = lineForUpsert(incoming, id, index);

      if (isUuid(incoming.id) && existingById.has(incoming.id)) {
        keepIds.add(incoming.id);
        const previous = existingById.get(incoming.id);
        const { data: savedLine, error: lineUpdateError } = await supabase
          .from("material_lines")
          .update(payload)
          .eq("id", incoming.id)
          .select("*")
          .single();
        if (lineUpdateError) throw lineUpdateError;

        for (const field of [
          "material_category",
          "material_type",
          "supplier",
          "material_po",
          "ead",
          "status",
          "sort_order",
        ]) {
          if (str(previous[field]) !== str(savedLine[field])) {
            auditEntries.push({
              user_id: user.id,
              action: "update_field",
              record_type: "material_lines",
              record_id: savedLine.id,
              field_name: field,
              old_value: str(previous[field]) || null,
              new_value: str(savedLine[field]) || null,
            });
          }
        }
      } else {
        const { data: createdLine, error: lineInsertError } = await supabase
          .from("material_lines")
          .insert(payload)
          .select("*")
          .single();
        if (lineInsertError) throw lineInsertError;
        keepIds.add(createdLine.id);
        auditEntries.push({
          user_id: user.id,
          action: "add_material_line",
          record_type: "material_lines",
          record_id: createdLine.id,
          field_name: "material_category",
          old_value: null,
          new_value: createdLine.material_category,
        });
      }
    }

    const toDelete = (existingLines || []).filter((line) => !keepIds.has(line.id));
    for (const line of toDelete) {
      const { error: deleteError } = await supabase
        .from("material_lines")
        .delete()
        .eq("id", line.id);
      if (deleteError) throw deleteError;
      auditEntries.push({
        user_id: user.id,
        action: "remove_material_line",
        record_type: "material_lines",
        record_id: line.id,
        field_name: "material_category",
        old_value: line.material_category,
        new_value: null,
      });
    }

    await writeAudit(supabase, auditEntries);

    const { data: finalLines, error: finalLinesError } = await supabase
      .from("material_lines")
      .select("*")
      .eq("needs_material_id", id)
      .order("sort_order", { ascending: true });

    if (finalLinesError) throw finalLinesError;

    return Response.json({
      row: mapRowFromDb(updatedParent, finalLines || []),
      audit_count: auditEntries.length,
    });
  } catch (error) {
    console.error("PUT /api/needs-material/[id] failed", error);
    return Response.json(
      {
        error: error?.message || "Failed to save needs material row",
      },
      { status: 500 }
    );
  }
}
