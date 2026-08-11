import { useState } from "react"
import { Modal } from "../ui/Modal"

export type FilterState = {
  minPrice?: number
  maxPrice?: number
  shipsFrom?: string
  color?: string
  material?: string
  size?: string
  occasion?: string
}

type FilterDrawerProps = {
  open: boolean
  onClose: () => void
  sort: string
  onSortChange: (sort: string) => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

const SORT_OPTIONS = [
  { value: "recommended", label: "Relevance" },
  { value: "top-sales", label: "Top sales" },
  { value: "recent", label: "Most recent" },
  { value: "price-asc", label: "Price low to high" },
  { value: "price-desc", label: "Price high to low" },
]

const PRICE_PRESETS = [
  { label: "Any price", min: undefined, max: undefined },
  { label: "Under USD 25", min: undefined, max: 25 },
  { label: "USD 25 to 50", min: 25, max: 50 },
  { label: "USD 50 to 100", min: 50, max: 100 },
  { label: "Over USD 100", min: 100, max: undefined },
]

const COLOR_OPTIONS = [
  { label: "Any", value: "", swatch: "linear-gradient(135deg, #ef4444, #facc15, #22c55e, #3b82f6, #a855f7)" },
  { label: "White", value: "White", swatch: "#ffffff" },
  { label: "Black", value: "Black", swatch: "#111827" },
  { label: "Red", value: "Red", swatch: "#ef4444" },
  { label: "Blue", value: "Blue", swatch: "#2563eb" },
  { label: "Yellow", value: "Yellow", swatch: "#facc15" },
  { label: "Green", value: "Green", swatch: "#16a34a" },
  { label: "Pink", value: "Pink", swatch: "#f9a8d4" },
  { label: "Purple", value: "Purple", swatch: "#9333ea" },
  { label: "Brown", value: "Brown", swatch: "#92400e" },
  { label: "Gray", value: "Gray", swatch: "#9ca3af" },
  { label: "Orange", value: "Orange", swatch: "#f97316" },
]
const MATERIAL_OPTIONS = ["Any", "Cotton", "Polyester", "Ceramic", "Canvas"]
const SIZE_OPTIONS = ["Any", "S", "M", "L", "XL"]
const OCCASION_OPTIONS = [
  "Valentine's Day",
  "Wedding & engagement",
  "Get well",
  "Housewarming",
  "General gift",
  "Reunion",
  "Birthday",
  "New Year",
  "Anniversary",
  "Retirement",
  "Prom",
  "Seasonal celebration",
]

export function FilterDrawer({ open, onClose, sort, onSortChange, filters, onFiltersChange }: FilterDrawerProps) {
  const [showAllOccasions, setShowAllOccasions] = useState(false)

  return (
    <Modal open={open} onClose={onClose} title="Filters" className="buyer-filter-drawer">
      <section className="buyer-filter-section">
        <h3>Sort by</h3>
        <div className="buyer-filter-options">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={sort === option.value ? "active" : ""}
              onClick={() => onSortChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="buyer-filter-section">
        <h3>Color</h3>
        <div className="buyer-filter-color-grid">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.label}
              type="button"
              className={(filters.color ?? "") === color.value ? "active" : ""}
              aria-label={color.label}
              title={color.label}
              onClick={() => onFiltersChange({ ...filters, color: color.value || undefined })}
            >
              <span className="buyer-filter-color-swatch" style={{ background: color.swatch }} aria-hidden="true" />
              <small>{color.label}</small>
            </button>
          ))}
        </div>
        <p className="buyer-filter-mock-note">Color filter is client-side until supplier catalog exposes color facets.</p>
      </section>

      <section className="buyer-filter-section">
        <h3>Material</h3>
        <div className="buyer-filter-chips">
          {MATERIAL_OPTIONS.map((material) => (
            <button
              key={material}
              type="button"
              className={(filters.material ?? "Any") === material ? "active" : ""}
              onClick={() => onFiltersChange({ ...filters, material: material === "Any" ? undefined : material })}
            >
              {material}
            </button>
          ))}
        </div>
      </section>

      <section className="buyer-filter-section">
        <h3>Size</h3>
        <div className="buyer-filter-chips">
          {SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              className={(filters.size ?? "Any") === size ? "active" : ""}
              onClick={() => onFiltersChange({ ...filters, size: size === "Any" ? undefined : size })}
            >
              {size}
            </button>
          ))}
        </div>
      </section>

      <section className="buyer-filter-section">
        <h3>Occasion</h3>
        <div className="buyer-filter-options">
          {OCCASION_OPTIONS.slice(0, showAllOccasions ? OCCASION_OPTIONS.length : 6).map((occasion) => (
            <button
              key={occasion}
              type="button"
              className={filters.occasion === occasion ? "active" : ""}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  occasion: filters.occasion === occasion ? undefined : occasion,
                })
              }
            >
              {occasion}
            </button>
          ))}
          <button type="button" onClick={() => setShowAllOccasions((show) => !show)}>
            {showAllOccasions ? "Show less" : "+ View more"}
          </button>
        </div>
        <p className="buyer-filter-mock-note">Occasion is UI-only until the catalog API exposes product tags.</p>
      </section>

      <section className="buyer-filter-section">
        <h3>Price</h3>
        <div className="buyer-filter-options">
          {PRICE_PRESETS.map((preset) => {
            const active = filters.minPrice === preset.min && filters.maxPrice === preset.max
            return (
              <button
                key={preset.label}
                type="button"
                className={active ? "active" : ""}
                onClick={() => onFiltersChange({ ...filters, minPrice: preset.min, maxPrice: preset.max })}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        <div className="buyer-filter-price-custom">
          <label>
            <span className="sr-only">Minimum price</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              placeholder="$ Min."
              value={filters.minPrice ?? ""}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  minPrice: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)),
                })
              }
            />
          </label>
          <span>–</span>
          <label>
            <span className="sr-only">Maximum price</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              placeholder="$ Max."
              value={filters.maxPrice ?? ""}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  maxPrice: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)),
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="buyer-filter-section">
        <h3>Ships from</h3>
        <div className="buyer-filter-options">
          {["Anywhere", "China", "United States"].map((region) => {
            const value = region === "Anywhere" ? "" : region
            return (
              <button
                key={region}
                type="button"
                className={(filters.shipsFrom ?? "") === value ? "active" : ""}
                onClick={() => onFiltersChange({ ...filters, shipsFrom: value || undefined })}
              >
                {region}
              </button>
            )
          })}
        </div>
        <p className="buyer-filter-mock-note">Ships from filter is UI-only until catalog API exposes fulfillment region.</p>
      </section>

      <div className="buyer-filter-actions">
        <button
          type="button"
          onClick={() => {
            onFiltersChange({})
            onSortChange("recommended")
          }}
        >
          Reset
        </button>
        <button type="button" className="primary" onClick={onClose}>
          Apply
        </button>
      </div>
    </Modal>
  )
}
