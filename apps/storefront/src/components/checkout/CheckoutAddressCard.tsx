import { useState, type FormEvent } from "react"
import type { CheckoutAddress } from "./CheckoutAddressPanel"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Modal } from "../ui/Modal"
import { StatusBadge } from "../ui/StatusBadge"
import { CHECKOUT_COUNTRIES } from "../../pages/checkout/checkout-countries"
import type { BuyerCustomerAddress, BuyerCustomerAddressInput } from "../../lib/buyer-api"
import type { CheckoutContact } from "./CheckoutContactForm"

type Props = {
  value: CheckoutAddress
  onSave: () => void
  required: boolean
  saving: boolean
  saved: boolean
  error?: string
  savedAddresses?: BuyerCustomerAddress[]
  selectedAddressId?: string
  onSelectSavedAddress?: (address: BuyerCustomerAddress) => void
  onCreateAddress?: (input: BuyerCustomerAddressInput) => Promise<void>
  contact?: CheckoutContact
  contactStatus?: "idle" | "saving" | "saved" | "error"
  contactError?: string
  emailVerified?: boolean
}

const emptyAddressInput: BuyerCustomerAddressInput = {
  label: "Home",
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  postalCode: "",
  countryCode: "us",
  phone: "",
  isDefaultShipping: true,
  isDefaultBilling: false,
}

const countryName = (countryCode?: string | null) =>
  CHECKOUT_COUNTRIES.find((country) => country.code === countryCode?.toLowerCase())?.name ??
  countryCode?.toUpperCase() ??
  ""

const formatAddressLine = (address: BuyerCustomerAddress) =>
  [address.city, address.province, countryName(address.countryCode)].filter(Boolean).join(", ")

const formatReceiver = (address: BuyerCustomerAddress) =>
  [[address.firstName, address.lastName].filter(Boolean).join(" "), address.phone].filter(Boolean).join(" ")

function AddressInputForm({
  onCancel,
  onSubmit,
  saving,
}: {
  onCancel: () => void
  onSubmit: (value: BuyerCustomerAddressInput) => Promise<void>
  saving: boolean
}) {
  const [value, setValue] = useState<BuyerCustomerAddressInput>(emptyAddressInput)
  const [error, setError] = useState<string>()
  const update = (key: keyof BuyerCustomerAddressInput, next: string | boolean) =>
    setValue((current) => ({ ...current, [key]: next }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(undefined)
    try {
      await onSubmit(value)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save delivery address.")
    }
  }

  return (
    <form className="buyer-checkout-address-modal-form" onSubmit={submit}>
      <label>
        <span><b>*</b> Country / Region</span>
        <select value={value.countryCode} onChange={(event) => update("countryCode", event.target.value)}>
          {CHECKOUT_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>{country.name}</option>
          ))}
        </select>
      </label>
      <label>
        <span><b>*</b> First Name, Last Name</span>
        <input
          required
          value={[value.firstName, value.lastName].filter(Boolean).join(" ")}
          onChange={(event) => {
            const [firstName, ...rest] = event.target.value.trimStart().split(/\s+/)
            update("firstName", firstName ?? "")
            update("lastName", rest.join(" "))
          }}
          placeholder="Receiver name"
        />
      </label>
      <label>
        <span><b>*</b> Address</span>
        <input required value={value.address1} onChange={(event) => update("address1", event.target.value)} placeholder="Street address" />
      </label>
      <label>
        <span>Apt, unit, building, floor, room, etc. (optional)</span>
        <input value={value.address2 ?? ""} onChange={(event) => update("address2", event.target.value)} />
      </label>
      <label>
        <span><b>*</b> City, State</span>
        <input
          required
          value={[value.city, value.province].filter(Boolean).join(", ")}
          onChange={(event) => {
            const [city, ...rest] = event.target.value.split(",")
            update("city", city?.trim() ?? "")
            update("province", rest.join(",").trim())
          }}
          placeholder="Los Angeles, California"
        />
      </label>
      <label>
        <span><b>*</b> Post code</span>
        <input required value={value.postalCode} onChange={(event) => update("postalCode", event.target.value)} />
      </label>
      <label>
        <span><b>*</b> Phone number</span>
        <input required value={value.phone ?? ""} onChange={(event) => update("phone", event.target.value)} />
      </label>
      <div className="buyer-checkout-address-labels" aria-label="Address label">
        {["Home", "Company", "School", "Parents", "Other"].map((label) => (
          <button key={label} type="button" className={value.label === label ? "active" : ""} onClick={() => update("label", label)}>
            {label}
          </button>
        ))}
      </div>
      <label className="buyer-checkout-address-default-toggle">
        <input
          type="checkbox"
          checked={value.isDefaultShipping}
          onChange={(event) => update("isDefaultShipping", event.target.checked)}
        />
        <span>Default</span>
      </label>
      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}
      <footer>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{saving ? "Saving..." : "Save address"}</Button>
      </footer>
    </form>
  )
}

export function CheckoutAddressCard({
  onSave,
  required,
  saving,
  saved,
  error,
  savedAddresses = [],
  selectedAddressId,
  onSelectSavedAddress,
  onCreateAddress,
  contactStatus,
  contactError,
  emailVerified = true,
}: Props) {
  const [modalMode, setModalMode] = useState<"select" | "new" | null>(null)
  const [creating, setCreating] = useState(false)
  const selectedAddress =
    savedAddresses.find((address) => address.id === selectedAddressId) ??
    (selectedAddressId ? null : savedAddresses.find((address) => address.isDefaultShipping)) ??
    null
  const canAddAddress = Boolean(onCreateAddress)

  const addAddress = async (input: BuyerCustomerAddressInput) => {
    if (!onCreateAddress) return
    setCreating(true)
    try {
      await onCreateAddress(input)
      setModalMode(null)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card as="section" className="buyer-checkout-card buyer-checkout-address-card buyer-checkout-delivery-card">
      <header>
        <div>
          <p>Contact &amp; Delivery</p>
          <h2>{selectedAddress ? "Delivery address" : "Add delivery address"}</h2>
        </div>
        <StatusBadge tone={saved ? "success" : error || contactError ? "danger" : "warning"}>
          {saved ? "Selected" : "Required"}
        </StatusBadge>
      </header>

      {emailVerified === false ? (
        <p className="buyer-checkout-inline-error" role="alert">
          Verify your account email in <a href="/account/security">Account &amp; Security</a> before placing the order.
        </p>
      ) : null}
      {contactError ? <p className="buyer-checkout-inline-error" role="alert">{contactError}</p> : null}
      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}

      {selectedAddress ? (
        <button
          type="button"
          className="buyer-checkout-selected-address"
          onClick={() => setModalMode("select")}
          aria-label="Change delivery address"
        >
          <span className="buyer-checkout-address-pin" aria-hidden="true">⌖</span>
          <span>
            <strong>{selectedAddress.address1}{selectedAddress.address2 ? `, ${selectedAddress.address2}` : ""}</strong>
            <small>{formatAddressLine(selectedAddress)}</small>
            <small>{formatReceiver(selectedAddress)}</small>
            <em>
              {selectedAddress.isDefaultShipping ? <b>Default</b> : null}
              <b>{selectedAddress.label || "Home"}</b>
            </em>
          </span>
          <i aria-hidden="true">›</i>
        </button>
      ) : (
        <div className="buyer-checkout-address-empty-new">
          <span aria-hidden="true">⌖</span>
          <strong>No default delivery address</strong>
          <p>Add a new address to continue checkout.</p>
        </div>
      )}

      <footer>
        {selectedAddress ? (
          <Button variant="secondary" loading={saving || contactStatus === "saving"} onClick={onSave}>
            {saving || contactStatus === "saving" ? "Applying..." : "Use this address"}
          </Button>
        ) : null}
        {!selectedAddress && savedAddresses.length ? (
          <Button variant="secondary" onClick={() => setModalMode("select")}>
            Choose saved address
          </Button>
        ) : null}
        <Button onClick={() => setModalMode("new")} disabled={!canAddAddress}>
          Add a new address
        </Button>
      </footer>

      <Modal
        open={modalMode === "select"}
        title="Delivery address"
        description="Select a saved address for this order."
        onClose={() => setModalMode(null)}
        className="buyer-checkout-address-modal"
      >
        <div className="buyer-checkout-address-picker">
          {savedAddresses.length ? savedAddresses.map((address) => (
            <button
              key={address.id}
              type="button"
              className={selectedAddress?.id === address.id ? "selected" : ""}
              onClick={() => {
                onSelectSavedAddress?.(address)
                setModalMode(null)
              }}
            >
              <span aria-hidden="true" />
              <strong>{address.address1}{address.address2 ? `, ${address.address2}` : ""}</strong>
              <small>{formatAddressLine(address)}</small>
              <small>{formatReceiver(address)}</small>
              <em>
                {address.isDefaultShipping ? <b>Default</b> : null}
                <b>{address.label || "Home"}</b>
              </em>
            </button>
          )) : (
            <p className="buyer-checkout-card-copy">No delivery address</p>
          )}
        </div>
        <Button fullWidth onClick={() => setModalMode("new")}>Add a new address</Button>
      </Modal>

      <Modal
        open={modalMode === "new"}
        title="Add delivery address"
        description="All data is safeguarded"
        onClose={() => setModalMode(null)}
        className="buyer-checkout-address-modal"
      >
        <AddressInputForm
          saving={creating}
          onCancel={() => setModalMode(selectedAddress ? "select" : null)}
          onSubmit={addAddress}
        />
      </Modal>

      {!required ? <p className="buyer-checkout-card-copy">Every item in this cart is marked as not requiring shipping.</p> : null}
    </Card>
  )
}
