import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { AccountAuthRequired } from "../../components/account/AccountAuthRequired"
import { AccountNavigation } from "../../components/account/AccountNavigation"
import { AccountCouponsPanel } from "../../components/account/AccountCouponsPanel"
import { AccountPaymentMethods } from "./AccountPaymentMethods"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { LoadingState } from "../../components/ui/States"
import {
  createCustomerAddress,
  deleteCustomerAddress,
  fetchStoreFollowState,
  listCustomerAddresses,
  readBuyerPreferences,
  updateBuyerPreferences,
  updateCustomerAddress,
  updateStoreFollowState,
  type BuyerCustomerAddress,
  type BuyerCustomerAddressInput,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { CHECKOUT_COUNTRIES } from "../checkout/checkout-countries"
import { customerAddressToInput } from "./account-settings-state"
import { writeBuyerDisplayPreferences, type DisplayCurrencyCode } from "../../lib/buyer-display-preferences"

export type AccountSettingsSlug = "addresses" | "payment-methods" | "country-region" | "currency" | "coupons" | "following"

const currencies = [
  { code: "auto", label: "Auto", symbol: "◎" },
  { code: "usd", label: "USD", symbol: "$" },
  { code: "eur", label: "EUR", symbol: "€" },
  { code: "gbp", label: "GBP", symbol: "£" },
  { code: "cny", label: "CNY", symbol: "¥" },
  { code: "cad", label: "CAD", symbol: "C$" },
  { code: "aud", label: "AUD", symbol: "A$" },
  { code: "jpy", label: "JPY", symbol: "¥" },
  { code: "sgd", label: "SGD", symbol: "S$" },
  { code: "myr", label: "MYR", symbol: "RM" },
]

const emptyAddress: BuyerCustomerAddressInput = {
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
  isDefaultShipping: false,
  isDefaultBilling: false,
}

function SettingsFrame({ title, children }: { title: string; children: ReactNode }) {
  return <Card as="section" className="buyer-account-settings-panel"><header><a href="/account" aria-label="Back to account">←</a><h1>{title}</h1></header>{children}</Card>
}

function AddressForm({ initial, onCancel, onSaved }: { initial?: BuyerCustomerAddress; onCancel: () => void; onSaved: (addresses: BuyerCustomerAddress[]) => void }) {
  const [value, setValue] = useState<BuyerCustomerAddressInput>(initial ? customerAddressToInput(initial) : emptyAddress)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const update = (key: keyof BuyerCustomerAddressInput, next: string | boolean) => setValue((current) => ({ ...current, [key]: next }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(undefined)
    try {
      const addresses = initial
        ? await updateCustomerAddress(initial.id, value)
        : await createCustomerAddress(value)
      onSaved(addresses)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save address.")
    } finally {
      setSaving(false)
    }
  }

  return <form className="buyer-address-form" onSubmit={submit}>
    <div className="buyer-address-form-grid">
      <label><span>Address label</span><input value={value.label ?? ""} onChange={(event) => update("label", event.target.value)} placeholder="Home" /></label>
      <label><span>Country / region</span><select value={value.countryCode} onChange={(event) => update("countryCode", event.target.value)}>{CHECKOUT_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
      <label><span>First name</span><input required value={value.firstName ?? ""} onChange={(event) => update("firstName", event.target.value)} /></label>
      <label><span>Last name</span><input required value={value.lastName ?? ""} onChange={(event) => update("lastName", event.target.value)} /></label>
      <label className="wide"><span>Street address</span><input required value={value.address1} onChange={(event) => update("address1", event.target.value)} /></label>
      <label className="wide"><span>Apartment, suite, unit</span><input value={value.address2 ?? ""} onChange={(event) => update("address2", event.target.value)} /></label>
      <label><span>City</span><input required value={value.city} onChange={(event) => update("city", event.target.value)} /></label>
      <label><span>State / province</span><input value={value.province ?? ""} onChange={(event) => update("province", event.target.value)} /></label>
      <label><span>Postal code</span><input required value={value.postalCode} onChange={(event) => update("postalCode", event.target.value)} /></label>
      <label><span>Phone</span><input value={value.phone ?? ""} onChange={(event) => update("phone", event.target.value)} /></label>
    </div>
    <label className="buyer-address-default"><input type="checkbox" checked={value.isDefaultShipping} onChange={(event) => update("isDefaultShipping", event.target.checked)} /> Use as default delivery address</label>
    {error ? <p className="buyer-account-error" role="alert">{error}</p> : null}
    <div className="buyer-account-actions"><Button type="submit" loading={saving}>{initial ? "Save changes" : "Add address"}</Button><Button variant="secondary" onClick={onCancel}>Cancel</Button></div>
  </form>
}

function AddressBook() {
  const [addresses, setAddresses] = useState<BuyerCustomerAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<BuyerCustomerAddress | "new" | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => { void listCustomerAddresses().then(setAddresses).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load addresses.")).finally(() => setLoading(false)) }, [])
  if (loading) return <SettingsFrame title="Delivery addresses"><LoadingState label="Loading saved addresses..." /></SettingsFrame>

  return <SettingsFrame title="Delivery addresses">
    {editing ? <AddressForm initial={editing === "new" ? undefined : editing} onCancel={() => setEditing(null)} onSaved={(next) => { setAddresses(next); setEditing(null) }} /> : <>
      {error ? <p className="buyer-account-error" role="alert">{error}</p> : null}
      {addresses.length ? <div className="buyer-address-list">{addresses.map((address) => <article key={address.id} className={address.isDefaultShipping ? "default" : ""}>
        <div><p>{[address.city, address.province, CHECKOUT_COUNTRIES.find((country) => country.code === address.countryCode)?.name].filter(Boolean).join(", ")}</p><h2>{address.address1}{address.address2 ? `, ${address.address2}` : ""}</h2><span>{[address.firstName, address.lastName].filter(Boolean).join(" ")} {address.phone}</span>{address.isDefaultShipping ? <small>Default</small> : null}</div>
        <div className="buyer-address-actions"><Button variant="secondary" onClick={() => setEditing(address)}>Edit</Button><Button variant="ghost" onClick={() => { if (window.confirm("Delete this saved address?")) void deleteCustomerAddress(address.id).then(setAddresses).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to delete address.")) }}>Delete</Button></div>
      </article>)}</div> : <div className="buyer-account-empty-state"><span aria-hidden="true">⌖</span><h2>No delivery addresses</h2><p>Add an address once, then select it during checkout.</p></div>}
      <footer><Button onClick={() => setEditing("new")}>Add a new address</Button></footer>
    </>}
  </SettingsFrame>
}

function PreferenceList({ kind }: { kind: "country" | "currency" }) {
  const auth = useBuyerAuth()
  const current = readBuyerPreferences(auth.customer)
  const [selected, setSelected] = useState(kind === "country" ? current.countryCode : current.currencyCode)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>()
  const options = kind === "country" ? CHECKOUT_COUNTRIES.map((entry) => ({ code: entry.code, label: entry.name, symbol: entry.code.toUpperCase() })) : currencies

  const save = async (code: string) => {
    setSelected(code); setSaving(true); setMessage(undefined)
    try {
      const update = kind === "country"
        ? { countryCode: code }
        : { currencyCode: code as DisplayCurrencyCode }
      await updateBuyerPreferences(update)
      writeBuyerDisplayPreferences(update)
      await auth.refreshCustomer()
      setMessage("Preference saved to your buyer account.")
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to save preference.") }
    finally { setSaving(false) }
  }

  return <SettingsFrame title={kind === "country" ? "Country & region" : "Currency"}>
    <div className="buyer-preference-list" aria-busy={saving}>{options.map((option) => <button key={option.code} type="button" className={selected === option.code ? "selected" : ""} onClick={() => void save(option.code)}><span>{option.label}</span><small>{option.symbol}</small>{selected === option.code ? <strong aria-label="Selected">✓</strong> : null}</button>)}</div>
    <p className="buyer-account-setting-note">{kind === "country" ? "Used for product availability and as the default country for checkout." : "Auto follows your delivery country. Display conversion does not change the cart or payment currency."}</p>
    {message ? <p className={message.startsWith("Preference saved") ? "buyer-account-success" : "buyer-account-error"} role="status">{message}</p> : null}
  </SettingsFrame>
}

function PaymentMethodsPanel() {
  return <SettingsFrame title="Payment methods"><AccountPaymentMethods /></SettingsFrame>
}

function FollowingList({ settings }: { settings: BuyerStoreSettings }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  useEffect(() => { void fetchStoreFollowState().then((state) => setFollowing(state.following)).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load following state.")).finally(() => setLoading(false)) }, [])
  return <SettingsFrame title="Following stores">{loading ? <LoadingState label="Loading followed stores..." /> : error ? <p className="buyer-account-error">{error}</p> : following ? <div className="buyer-following-list"><article>{settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <span>{settings.brandName.slice(0, 1)}</span>}<div><h2>{settings.brandName}</h2><p>Following this store</p></div><Button href="/store" variant="secondary">View</Button><Button variant="ghost" onClick={() => void updateStoreFollowState(false).then(() => setFollowing(false))}>Unfollow</Button></article></div> : <div className="buyer-account-empty-state"><span aria-hidden="true">♡</span><h2>No followed stores</h2><p>Stores you follow will appear here.</p><Button href="/store">Browse store</Button></div>}</SettingsFrame>
}

export function AccountSettingsPage({ cartCount, slug }: { cartCount: number; slug: AccountSettingsSlug }) {
  const auth = useBuyerAuth()
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const content = useMemo(() => {
    if (slug === "addresses") return <AddressBook />
    if (slug === "payment-methods") return <PaymentMethodsPanel />
    if (slug === "country-region") return <PreferenceList kind="country" />
    if (slug === "currency") return <PreferenceList kind="currency" />
    if (slug === "following") return <FollowingList settings={settings} />
    return <AccountCouponsPanel />
  }, [settings, slug])

  return <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>{auth.isLoading ? <LoadingState label="Loading account settings..." /> : !auth.customer ? <AccountAuthRequired /> : <section className="buyer-account-layout"><AccountNavigation customer={auth.customer} onSignOut={() => void auth.signOut().then(() => window.location.assign("/store"))} onSwitchAccount={() => void auth.signOut().then(() => window.location.assign("/account/sign-in"))} />{content}</section>}</AccountAuthLayout>
}
