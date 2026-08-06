/** Minimum fields required to accept a row as the header. */
const HEADER_DETECT_FIELDS = [
  "work_order",
  "production_status",
  "customer",
  "due_date",
  "part_number",
  "quantity",
];

/** Fields we import when present. */
const IMPORT_FIELDS = [
  "work_order",
  "customer_po",
  "customer",
  "order_date",
  "due_date",
  "esd",
  "part_number",
  "description",
  "quantity",
  "production_status",
];

const HEADER_ALIASES = {
  WO: "work_order",
  "WORK ORDER": "work_order",
  WORKORDER: "work_order",
  "PO #": "customer_po",
  "PO#": "customer_po",
  PO: "customer_po",
  "CUSTOMER PO": "customer_po",
  CUSTOMER: "customer",
  "ORDER DATE": "order_date",
  ORDER_DATE: "order_date",
  "DUE DATE": "due_date",
  DUE_DATE: "due_date",
  ESD: "esd",
  "PART #": "part_number",
  "PART#": "part_number",
  "PART NUMBER": "part_number",
  PART: "part_number",
  DESCRIPTION: "description",
  QTY: "quantity",
  QUANTITY: "quantity",
  STATUS: "production_status",
  "PRODUCTION STATUS": "production_status",
};

const FIELD_LABELS = {
  work_order: "WO",
  customer_po: "PO #",
  customer: "CUSTOMER",
  order_date: "ORDER DATE",
  due_date: "DUE DATE",
  esd: "ESD",
  part_number: "PART #",
  description: "DESCRIPTION",
  quantity: "QTY",
  production_status: "STATUS",
};

export function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export function cellToString(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") {
    return value
      .replace(/\u00a0/g, " ")
      .replace(/[\r\n\u2028\u2029]+/g, " ")
      .trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value).trim();
}

function excelSerialToYmd(serial) {
  if (!Number.isFinite(serial)) return null;
  // Excel/Graph serial date: days since 1899-12-30
  const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  if (Number.isNaN(utc.getTime())) return null;
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  if (y < 1900 || y > 2200) return null;
  return `${y}-${m}-${d}`;
}

export function parseDateCell(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return { value: null, error: null };
  }
  if (typeof value === "number") {
    const ymd = excelSerialToYmd(value);
    if (!ymd) {
      return {
        value: null,
        error: `Invalid numeric date for ${fieldName}`,
      };
    }
    return { value: ymd, error: null };
  }

  const text = cellToString(value);
  if (!text) return { value: null, error: null };

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const ymd = text.slice(0, 10);
    const dt = new Date(`${ymd}T12:00:00Z`);
    if (Number.isNaN(dt.getTime())) {
      return { value: null, error: `Invalid date for ${fieldName}: ${text}` };
    }
    return { value: ymd, error: null };
  }

  const mdy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    let year = Number(mdy[3]);
    if (year < 100) year += 2000;
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const dt = new Date(Date.UTC(year, month - 1, day, 12));
    if (
      Number.isNaN(dt.getTime()) ||
      dt.getUTCFullYear() !== year ||
      dt.getUTCMonth() !== month - 1 ||
      dt.getUTCDate() !== day
    ) {
      return { value: null, error: `Invalid date for ${fieldName}: ${text}` };
    }
    return {
      value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      error: null,
    };
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    const ymd = excelSerialToYmd(Number(text));
    if (ymd) return { value: ymd, error: null };
  }

  return { value: null, error: `Invalid date for ${fieldName}: ${text}` };
}

export function parseQuantity(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = cellToString(value).replace(/,/g, "");
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

export function buildHeaderMap(headerRow = []) {
  const indexByField = {};
  const normalizedHeadersFound = [];

  headerRow.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    if (!normalized) return;
    // Keep letter-bearing labels in diagnostics; skip filler cells from wide used ranges.
    if (/[A-Z]/.test(normalized)) {
      normalizedHeadersFound.push(normalized);
    }
    const field = HEADER_ALIASES[normalized];
    if (field && indexByField[field] === undefined) {
      indexByField[field] = index;
    }
  });

  const missingDetectColumns = HEADER_DETECT_FIELDS.filter(
    (field) => indexByField[field] === undefined
  ).map((field) => FIELD_LABELS[field] || field);

  const missingImportColumns = IMPORT_FIELDS.filter(
    (field) => indexByField[field] === undefined
  ).map((field) => FIELD_LABELS[field] || field);

  return {
    indexByField,
    missingDetectColumns,
    missingImportColumns,
    normalizedHeadersFound,
  };
}

/**
 * Scan the first `maxScan` rows for a header containing the minimum required columns.
 */
export function findHeaderRow(values, maxScan = 10) {
  const limit = Math.min(maxScan, values.length);
  for (let index = 0; index < limit; index += 1) {
    const row = Array.isArray(values[index]) ? values[index] : [];
    const mapped = buildHeaderMap(row);
    if (mapped.missingDetectColumns.length === 0) {
      return {
        headerRowIndex: index,
        headerRowNumber: index + 1,
        ...mapped,
      };
    }
  }
  return null;
}

function getCell(row, indexByField, field) {
  const index = indexByField[field];
  if (index === undefined) return "";
  return row[index];
}

export function isNeedMaterialStatus(value) {
  return cellToString(value).toLowerCase() === "need material";
}

/**
 * Parse Graph usedRange values into distinct Need Material work orders.
 */
export function parseSchedulerRows(values) {
  const diagnostics = {
    headerRowNumber: null,
    normalizedHeadersFound: [],
    blankWoSkipped: 0,
    duplicateWoSkipped: 0,
    invalidDates: [],
    missingColumns: [],
    missingWorksheet: false,
  };

  if (!Array.isArray(values) || values.length === 0) {
    const err = new Error("Worksheet used range is empty");
    err.code = "EMPTY_RANGE";
    err.diagnostics = diagnostics;
    throw err;
  }

  const header = findHeaderRow(values, 10);
  if (!header) {
    diagnostics.missingColumns = [
      "WO",
      "STATUS",
      "CUSTOMER",
      "DUE DATE",
      "PART #",
      "QTY",
    ];
    const err = new Error(
      "Could not find a header row in the first 10 rows containing WO, STATUS, CUSTOMER, DUE DATE, PART #, and QTY"
    );
    err.code = "MISSING_COLUMNS";
    err.diagnostics = diagnostics;
    throw err;
  }

  diagnostics.headerRowNumber = header.headerRowNumber;
  diagnostics.normalizedHeadersFound = header.normalizedHeadersFound;
  diagnostics.missingColumns = header.missingImportColumns;

  const { indexByField } = header;
  const dataRows = values.slice(header.headerRowIndex + 1);
  const rowsInspected = dataRows.length;
  let matchingRows = 0;
  const byWorkOrder = new Map();

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = Array.isArray(dataRows[i]) ? dataRows[i] : [];
    const sheetRowNumber = header.headerRowNumber + 1 + i;
    const statusRaw = getCell(row, indexByField, "production_status");
    if (!isNeedMaterialStatus(statusRaw)) continue;
    matchingRows += 1;

    const workOrder = cellToString(getCell(row, indexByField, "work_order"));
    if (!workOrder) {
      diagnostics.blankWoSkipped += 1;
      continue;
    }

    if (byWorkOrder.has(workOrder)) {
      diagnostics.duplicateWoSkipped += 1;
      continue;
    }

    const orderDate = parseDateCell(
      getCell(row, indexByField, "order_date"),
      "ORDER DATE"
    );
    const dueDate = parseDateCell(
      getCell(row, indexByField, "due_date"),
      "DUE DATE"
    );
    const esd = parseDateCell(getCell(row, indexByField, "esd"), "ESD");

    const dateErrors = [orderDate.error, dueDate.error, esd.error].filter(
      Boolean
    );
    if (dateErrors.length) {
      diagnostics.invalidDates.push({
        work_order: workOrder,
        row: sheetRowNumber,
        errors: dateErrors,
      });
    }

    byWorkOrder.set(workOrder, {
      work_order: workOrder,
      customer_po: cellToString(getCell(row, indexByField, "customer_po")),
      customer: cellToString(getCell(row, indexByField, "customer")),
      order_date: orderDate.value,
      due_date: dueDate.value,
      esd: esd.value,
      part_number: cellToString(getCell(row, indexByField, "part_number")),
      description: cellToString(getCell(row, indexByField, "description")),
      quantity: parseQuantity(getCell(row, indexByField, "quantity")),
      production_status: "Need Material",
    });
  }

  return {
    rowsInspected,
    matchingRows,
    distinctWorkOrders: byWorkOrder.size,
    records: [...byWorkOrder.values()],
    diagnostics,
  };
}
