import { sampleRows } from "../../../data/sample-data";
import { getSupabaseAdmin } from "../../../lib/supabase/server";
import {
  lineForUpsert,
  mapRowFromDb,
  parentForInsert,
} from "../../../lib/needs-material/map";

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

async function seedFromSample(supabase) {
  for (const sample of sampleRows) {
    const { data: parent, error: parentError } = await supabase
      .from("needs_material")
      .insert(parentForInsert(sample))
      .select("*")
      .single();

    if (parentError) throw parentError;

    const lines = Array.isArray(sample.material_lines)
      ? sample.material_lines
      : [];

    if (lines.length) {
      const payloads = lines.map((line, index) =>
        lineForUpsert(line, parent.id, index)
      );
      const { error: lineError } = await supabase
        .from("material_lines")
        .insert(payloads);
      if (lineError) throw lineError;
    }
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { count, error: countError } = await supabase
      .from("needs_material")
      .select("id", { count: "exact", head: true });

    if (countError) throw countError;

    let seeded = false;
    if ((count || 0) === 0) {
      await seedFromSample(supabase);
      seeded = true;
    }

    const rows = await loadAllRows(supabase);
    return Response.json({ rows, seeded, source: "supabase" });
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
