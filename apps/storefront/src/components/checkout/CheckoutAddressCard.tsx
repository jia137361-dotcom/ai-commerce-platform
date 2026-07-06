import { useState } from "react"
import type { CheckoutAddress } from "./CheckoutAddressPanel"
import type { CheckoutContact } from "./CheckoutContactForm"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { FormField } from "../ui/FormField"
import { Modal } from "../ui/Modal"
import { StatusBadge } from "../ui/StatusBadge"
import { CHECKOUT_COUNTRIES } from "../../pages/checkout/checkout-countries"
import type { BuyerCustomerAddress } from "../../lib/buyer-api"

export type CheckoutCountryOption = {
  code: string
  name: string
}

type Props = {
  value: CheckoutAddress
  onChange: (value: CheckoutAddress) => void
  onSave: () => void
  required: boolean
  saving: boolean
  saved: boolean
  error?: string
  savedAddresses?: BuyerCustomerAddress[]
  selectedAddressId?: string
  onSelectSavedAddress?: (address: BuyerCustomerAddress) => void
  onUseNewAddress?: () => void
  saveToAddressBook?: boolean
  onSaveToAddressBookChange?: (value: boolean) => void
  canSaveToAddressBook?: boolean
  contact?: CheckoutContact
  onContactChange?: (value: CheckoutContact) => void
  contactError?: string
  emailVerified?: boolean
  countryOptions?: readonly CheckoutCountryOption[]
  preferredCountryCodes?: string[]
}

const countryName = (code: string, options: readonly CheckoutCountryOption[]) =>
  options.find((country) => country.code === code)?.name ?? code.toUpperCase()

const addressLines = (address: CheckoutAddress, contact: CheckoutContact | undefined, options: readonly CheckoutCountryOption[]) => [
  contact?.name,
  contact?.phone,
  contact?.email,
  address.address1,
  address.address2,
  [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
  address.country ? countryName(address.country, options) : "",
].filter((line): line is string => Boolean(line?.trim()))

const savedAddressLine = (address: BuyerCustomerAddress, options: readonly CheckoutCountryOption[]) => [
  address.address1,
  address.address2,
  [address.city, address.province, address.postalCode].filter(Boolean).join(", "),
  countryName(address.countryCode, options),
].filter(Boolean).join(" · ")

export function CheckoutAddressCard({
  value,
  onChange,
  onSave,
  required,
  saving,
  saved,
  error,
  savedAddresses = [],
  selectedAddressId,
  onSelectSavedAddress,
  onUseNewAddress,
  saveToAddressBook = false,
  onSaveToAddressBookChange,
  canSaveToAddressBook = false,
  contact,
  onContactChange,
  contactError,
  emailVerified = true,
  countryOptions = CHECKOUT_COUNTRIES,
  preferredCountryCodes = [],
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"saved" | "new">("saved")
  const lines = addressLines(value, contact, countryOptions)
  const hasAddress = Boolean(value.address1.trim() && value.city.trim())
  const preferredSet = new Set(preferredCountryCodes.map((code) => code.toLowerCase()))
  const selectedSavedAddress = savedAddresses.find((entry) => entry.id === selectedAddressId)
  const selectedOutsidePreferences = Boolean(selectedSavedAddress && preferredSet.size && !preferredSet.has(selectedSavedAddress.countryCode.toLowerCase()))

  const update = (field: keyof CheckoutAddress, fieldValue: string) => onChange({ ...value, [field]: fieldValue })
  const updateContact = (field: keyof CheckoutContact, fieldValue: string) => {
    if (!contact) return
    onContactChange?.({ ...contact, [field]: fieldValue })
  }

  const startNewAddress = () => {
    onUseNewAddress?.()
    setDialogMode("new")
    setDialogOpen(true)
  }

  const selectSaved = (address: BuyerCustomerAddress) => {
    onSelectSavedAddress?.(address)
    setDialogOpen(false)
  }

  const saveNewAddress = () => {
    onSave()
    setDialogOpen(false)
  }

  return (
    <Card as="section" className="buyer-checkout-card buyer-checkout-address-card">
      <header>
        <div><p>Step 1</p><h2>Shipping address</h2></div>
        <StatusBadge tone={!required ? "neutral" : saved ? "success" : error || contactError ? "danger" : "warning"}>
          {!required ? "Not required" : saved ? "Selected" : error || contactError ? "Error" : "Required"}
        </StatusBadge>
      </header>

      {!required ? (
        <p className="buyer-checkout-card-copy">Every item in this cart is marked as not requiring shipping.</p>
      ) : (
        <div className="buyer-checkout-address-overview">
          {emailVerified === false ? <p className="buyer-checkout-inline-error" role="alert">Verify your account email in <a href="/account/security">Account &amp; Security</a> before placing the order.</p> : null}
          {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}
          {contactError ? <p className="buyer-checkout-inline-error" role="alert">{contactError}</p> : null}
          {selectedOutsidePreferences ? <p className="buyer-checkout-info-note">This address is outside your preferred regions. Checkout availability still depends on product shipping regions.</p> : null}
          {hasAddress ? (
            <div className="buyer-checkout-selected-address">
              <div>
                <strong>{contact?.name || "Receiver"}</strong>
                <p>{lines.map((line) => <span key={line}>{line}<br /></span>)}</p>
              </div>
              <StatusBadge tone={saved ? "success" : "warning"}>{saved ? "Saved to cart" : "Unsaved changes"}</StatusBadge>
            </div>
          ) : (
            <div className="buyer-checkout-selected-address empty">
              <strong>No shipping address selected</strong>
              <p>Choose a saved address or add a new one to load shipping methods.</p>
            </div>
          )}
          <div className="buyer-checkout-address-actions">
            <Button variant="secondary" onClick={() => { setDialogMode(savedAddresses.length ? "saved" : "new"); setDialogOpen(true) }}>
              Choose saved address
            </Button>
            <Button variant="ghost" onClick={startNewAddress}>Add new address</Button>
          </div>
        </div>
      )}

      <Modal
        open={dialogOpen}
        eyebrow="Checkout"
        title={dialogMode === "saved" ? "Choose shipping address" : "Add new shipping address"}
        description={dialogMode === "saved" ? "Select the address for this order." : "Receiver details, phone, and email are saved with the shipping address for checkout."}
        onClose={() => setDialogOpen(false)}
        className="buyer-checkout-address-modal"
        footer={dialogMode === "new" ? (
          <>
            <Button variant="secondary" disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={saveNewAddress}>{saving ? "Saving..." : "Save shipping address"}</Button>
          </>
        ) : undefined}
      >
        {dialogMode === "saved" ? (
          <div className="buyer-checkout-address-picker">
            {savedAddresses.length ? savedAddresses.map((address) => (
              <button
                type="button"
                key={address.id}
                className={selectedAddressId === address.id ? "selected" : ""}
                onClick={() => selectSaved(address)}
              >
                <span>
                  <strong>{[address.firstName, address.lastName].filter(Boolean).join(" ") || address.label || "Receiver"}</strong>
                  <small>{address.phone || "Phone not provided"}</small>
                  <small>{savedAddressLine(address, countryOptions)}</small>
                </span>
                <StatusBadge tone={selectedAddressId === address.id ? "success" : "neutral"}>
                  {selectedAddressId === address.id ? "Selected" : "Use this"}
                </StatusBadge>
              </button>
            )) : (
              <p className="buyer-checkout-card-copy">No saved addresses yet.</p>
            )}
            <Button variant="secondary" onClick={startNewAddress}>Add new address</Button>
          </div>
        ) : (
          <>
            <div className="buyer-checkout-form-grid buyer-checkout-address-form-grid">
              <FormField className="wide" label="Receiver name" value={contact?.name ?? ""} onChange={(event) => updateContact("name", event.target.value)} placeholder="Jane Doe" />
              <FormField label="Phone" type="tel" value={contact?.phone ?? ""} onChange={(event) => updateContact("phone", event.target.value)} placeholder="+1 555 123 4567" />
              <FormField label="Email" type="email" value={contact?.email ?? ""} onChange={(event) => updateContact("email", event.target.value)} placeholder="buyer@example.com" />
              <label className="buyer-ui-field">
                <span>Country / region</span>
                <select value={value.country} onChange={(event) => update("country", event.target.value)}>
                  {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                </select>
              </label>
              <FormField label="State / province" value={value.state} onChange={(event) => update("state", event.target.value)} placeholder="California" />
              <FormField label="City" value={value.city} onChange={(event) => update("city", event.target.value)} />
              <FormField label="Postal code" value={value.postalCode} onChange={(event) => update("postalCode", event.target.value)} />
              <FormField className="wide" label="Street address" value={value.address1} onChange={(event) => update("address1", event.target.value)} />
              <FormField className="wide" label="Apt, suite, unit optional" value={value.address2} onChange={(event) => update("address2", event.target.value)} />
            </div>
            {canSaveToAddressBook ? (
              <label className="buyer-checkout-save-address">
                <input
                  type="checkbox"
                  checked={saveToAddressBook}
                  onChange={(event) => onSaveToAddressBookChange?.(event.target.checked)}
                />
                <span>Save this address to my address book</span>
              </label>
            ) : null}
          </>
        )}
      </Modal>
    </Card>
  )
}
