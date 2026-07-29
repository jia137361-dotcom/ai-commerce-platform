export const S2B_IMPORT_CSV_COLUMNS = [
  "source",
  "source_product_id",
  "source_variant_id",
  "supplier_sku",
  "seller_title",
  "seller_description",
  "category_level_1",
  "category_level_2",
  "product_type",
  "design",
  "color",
  "size",
  "weight",
  "cost",
  "selling_price",
  "currency",
  "warehouse_region",
  "sellable_country_codes",
  "image_urls",
  "publish_action",
] as const

export type S2bImportCsvColumn = (typeof S2B_IMPORT_CSV_COLUMNS)[number]
export type S2bImportCsvRow = Record<S2bImportCsvColumn, string>

const needsQuoting = /[",\n\r]/

export function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value)
  if (!needsQuoting.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

export function rowsToCsv(rows: Array<Record<string, unknown>>) {
  const header = S2B_IMPORT_CSV_COLUMNS.join(",")
  const body = rows.map((row) =>
    S2B_IMPORT_CSV_COLUMNS.map((column) => csvEscape(row[column])).join(",")
  )
  return [header, ...body].join("\n")
}

export function parseCsv(text: string): S2bImportCsvRow[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(cell)
      cell = ""
    } else if (char === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else if (char !== "\r") {
      cell += char
    }
  }
  row.push(cell)
  rows.push(row)

  const [headerRow, ...dataRows] = rows.filter((entry) => entry.some((value) => value.trim()))
  if (!headerRow) return []
  const header = headerRow.map((value) => value.trim())
  return dataRows.map((values) => {
    const parsed: Record<string, string> = {}
    for (let index = 0; index < header.length; index += 1) {
      parsed[header[index]] = values[index]?.trim() ?? ""
    }
    for (const column of S2B_IMPORT_CSV_COLUMNS) {
      parsed[column] = parsed[column] ?? ""
    }
    return parsed as S2bImportCsvRow
  })
}
