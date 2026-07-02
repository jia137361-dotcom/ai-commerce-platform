import type { CheckoutAddress } from "./CheckoutAddressPanel"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { FormField } from "../ui/FormField"
import { StatusBadge } from "../ui/StatusBadge"
import { CHECKOUT_COUNTRIES } from "../../pages/checkout/checkout-countries"
import type { BuyerCustomerAddress } from "../../lib/buyer-api"
import type { CheckoutContact } from "./CheckoutContactForm"

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
  onSaveContact?: () => void
  contactStatus?: "idle" | "saving" | "saved" | "error"
  contactError?: string
  emailVerified?: boolean
}

export function CheckoutAddressCard({ value, onChange, onSave, required, saving, saved, error, savedAddresses = [], selectedAddressId, onSelectSavedAddress, onUseNewAddress, saveToAddressBook = false, onSaveToAddressBookChange, canSaveToAddressBook = false, contact, onContactChange, onSaveContact, contactStatus, contactError, emailVerified = true }: Props) {
  const update = (field: keyof CheckoutAddress, fieldValue: string) => onChange({ ...value, [field]: fieldValue })
  const updateContact = (field: keyof CheckoutContact, fieldValue: string) => contact && onContactChange?.({ ...contact, [field]: fieldValue })
  return (
    <Card as="section" className="buyer-checkout-card buyer-checkout-address-card">
      <header><div><p>Step 1</p><h2>Contact &amp; delivery address</h2></div><StatusBadge tone={!required ? "neutral" : saved && contactStatus === "saved" ? "success" : error || contactError ? "danger" : "warning"}>{!required ? "Contact required" : saved && contactStatus === "saved" ? "Saved" : error || contactError ? "Error" : "Required"}</StatusBadge></header>
      {contact ? <>
        {emailVerified === false ? <p className="buyer-checkout-inline-error" role="alert">Verify your account email in <a href="/account/security">Account &amp; Security</a> before placing the order.</p> : null}
        {contactError ? <p className="buyer-checkout-inline-error" role="alert">{contactError}</p> : null}
        <div className="buyer-checkout-form-grid">
          <FormField label="Email" type="email" value={contact.email} onChange={(event) => updateContact("email", event.target.value)} placeholder="buyer@example.com" />
          <FormField label="Phone" type="tel" value={contact.phone} onChange={(event) => updateContact("phone", event.target.value)} placeholder="+86 138 0000 0000" />
          <FormField className="wide" label="Receiver name" value={contact.name} onChange={(event) => updateContact("name", event.target.value)} />
        </div>
        <footer><Button variant="secondary" loading={contactStatus === "saving"} onClick={onSaveContact}>{contactStatus === "saved" ? "Save contact changes" : "Save contact"}</Button></footer>
      </> : null}
      {!required ? <p className="buyer-checkout-card-copy">Every item in this cart is marked as not requiring shipping.</p> : <>
        {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}
        {savedAddresses.length ? <div className="buyer-checkout-saved-addresses" aria-label="Saved delivery addresses"><div><strong>Saved addresses</strong><a href="/account/addresses">Manage</a></div>{savedAddresses.map((address) => <button type="button" className={selectedAddressId === address.id ? "selected" : ""} key={address.id} onClick={() => onSelectSavedAddress?.(address)}><span>{address.label || "Delivery address"}{address.isDefaultShipping ? " · Default" : ""}</span><small>{address.address1}, {address.city}, {address.countryCode.toUpperCase()}</small><strong aria-hidden="true">{selectedAddressId === address.id ? "✓" : "○"}</strong></button>)}</div> : <p className="buyer-checkout-card-copy">No saved addresses yet. Enter a new address below or <a href="/account/addresses">add one in your account</a>.</p>}
        {savedAddresses.length ? <footer><Button variant="ghost" onClick={onUseNewAddress}>Use a new address</Button></footer> : null}
        <div className="buyer-checkout-form-grid">
          <label className="buyer-ui-field">
            <span>Country / region</span>
            <select value={value.country} onChange={(event) => update("country", event.target.value)}>
              {CHECKOUT_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>
          </label>
          <FormField label="State / province" value={value.state} onChange={(event) => update("state", event.target.value)} placeholder="Shanghai" />
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
            <span>Save this new address to my address book</span>
          </label>
        ) : null}
        <footer><Button variant="secondary" loading={saving} onClick={onSave}>{saving ? "Saving..." : saved ? "Save changes" : "Save address"}</Button></footer>
      </>}
    </Card>
  )
}
