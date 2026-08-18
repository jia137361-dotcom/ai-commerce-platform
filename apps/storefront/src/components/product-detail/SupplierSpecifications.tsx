import { useState } from "react"
import type { SupplierProductDetails } from "../../lib/mock-data"
import { sanitizeProductDescription } from "../../lib/product-description"

type SpecificationTable = NonNullable<SupplierProductDetails["sizeChart"]>

function SpecificationTable({ table }: { table: SpecificationTable }) {
  return (
    <div className="buyer-supplier-specification-table-wrap">
      <table className="buyer-supplier-specification-table">
        <thead>
          <tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={index}>
              {table.columns.map((column) => <td key={column}>{row[column] || "-"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SupplierSpecifications({ details }: { details?: SupplierProductDetails }) {
  const [activeTab, setActiveTab] = useState("description")
  if (!details) return null
  const basicDetails = details.basicDetails ?? []
  const hasBasic = basicDetails.length > 0
  const hasSize = Boolean(details.sizeChart?.rows.length)
  const hasPackaging = Boolean(details.packagingSpecs?.rows.length)
  const hasDescription = hasBasic || Boolean(details.englishDescription)
  if (!hasDescription && !hasSize && !hasPackaging) return null
  const tabs = [
    hasDescription ? { id: "description", label: "Product details" } : null,
    hasSize ? { id: "size", label: "Size chart" } : null,
    hasPackaging ? { id: "packaging", label: "Packaging" } : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>

  return (
    <div className="buyer-supplier-specifications">
      <div className="buyer-supplier-tabs" role="tablist" aria-label="Supplier product information">
        {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
      </div>
      {hasBasic ? (
        <section hidden={activeTab !== "description"}>
          <h3>Basic information</h3>
          <dl className="buyer-supplier-basic-grid">
            {basicDetails.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl>
          {details.englishDescription ? <div className="buyer-supplier-description-content" dangerouslySetInnerHTML={{ __html: sanitizeProductDescription(details.englishDescription) }} /> : null}
        </section>
      ) : null}
      {hasSize ? (
        <section hidden={activeTab !== "size"}>
          <h3>Size information</h3>
          <SpecificationTable table={details.sizeChart!} />
        </section>
      ) : null}
      {hasPackaging ? (
        <section hidden={activeTab !== "packaging"}>
          <h3>Packaging specifications</h3>
          <SpecificationTable table={details.packagingSpecs!} />
        </section>
      ) : null}
    </div>
  )
}
