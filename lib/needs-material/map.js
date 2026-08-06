const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

export function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

export function mapLineFromDb(line) {
  return {
    id: line.id,
    material_category: line.material_category === "Shapes" ? "Shapes" : "Flats",
    material_type: line.material_type || "",
    supplier: line.supplier || "",
    material_po: line.material_po || "",
    ead: line.ead || "",
    status: line.status || "Not Ordered",
    sort_order: line.sort_order ?? 0,
  };
}

export function mapRowFromDb(row, lines = []) {
  return {
    id: row.id,
    work_order: row.work_order,
    customer_po: row.customer_po || "",
    customer: row.customer || "",
    order_date: row.order_date || "",
    due_date: row.due_date || "",
    esd: row.esd || "",
    part_number: row.part_number || "",
    description: row.description || "",
    quantity: row.quantity === null || row.quantity === undefined ? "" : row.quantity,
    production_status: row.production_status || "Need Material",
    owner: row.owner || "Unassigned",
    follow_up_notes: row.follow_up_notes || "",
    active: row.active !== false,
    material_lines: [...lines]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(mapLineFromDb),
  };
}

export function parentForInsert(sample) {
  return {
    work_order: sample.work_order,
    customer_po: emptyToNull(sample.customer_po),
    customer: emptyToNull(sample.customer),
    order_date: emptyToNull(sample.order_date),
    due_date: emptyToNull(sample.due_date),
    esd: emptyToNull(sample.esd),
    part_number: emptyToNull(sample.part_number),
    description: emptyToNull(sample.description),
    quantity:
      sample.quantity === "" || sample.quantity === undefined || sample.quantity === null
        ? null
        : Number(sample.quantity),
    production_status: sample.production_status || "Need Material",
    owner: emptyToNull(sample.owner) || "Unassigned",
    follow_up_notes: emptyToNull(sample.follow_up_notes) || "",
    active: sample.active !== false,
  };
}

/** Scheduler-controlled fields only — never owner / follow_up_notes. */
export function parentSchedulerUpsert(record, seenAt) {
  return {
    work_order: record.work_order,
    customer_po: emptyToNull(record.customer_po),
    customer: emptyToNull(record.customer),
    order_date: emptyToNull(record.order_date),
    due_date: emptyToNull(record.due_date),
    esd: emptyToNull(record.esd),
    part_number: emptyToNull(record.part_number),
    description: emptyToNull(record.description),
    quantity:
      record.quantity === "" || record.quantity === undefined || record.quantity === null
        ? null
        : Number(record.quantity),
    production_status: record.production_status || "Need Material",
    active: true,
    source_last_seen_at: seenAt,
  };
}

export function lineForUpsert(line, needsMaterialId, index) {
  const payload = {
    needs_material_id: needsMaterialId,
    material_category: line.material_category === "Shapes" ? "Shapes" : "Flats",
    material_type: emptyToNull(line.material_type),
    supplier: emptyToNull(line.supplier),
    material_po: emptyToNull(line.material_po),
    ead: emptyToNull(line.ead),
    status: line.status || "Not Ordered",
    sort_order: line.sort_order ?? index,
  };
  if (isUuid(line.id)) payload.id = line.id;
  return payload;
}

export function parentDashboardPatch(body) {
  return {
    owner: emptyToNull(body.owner) || "Unassigned",
    follow_up_notes: body.follow_up_notes ?? "",
  };
}
