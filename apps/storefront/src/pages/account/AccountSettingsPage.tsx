import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { AccountAuthRequired } from "../../components/account/AccountAuthRequired"
import { AccountNavigation } from "../../components/account/AccountNavigation"
import { AccountCouponsEmpty } from "../../components/account/AccountCouponsEmpty"
import { AccountPaymentMethods } from "./AccountPaymentMethods"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { LoadingState } from "../../components/ui/States"
import {
  createCustomerAddress,
  deleteCustomerAddress,
  fetchShipToRegions,
  fetchStoreFollowState,
  listCustomerAddresses,
  readBuyerPreferences,
  updateBuyerPreferences,
  updateCustomerAddress,
  updateStoreFollowState,
  type BuyerCustomerAddress,
  type BuyerCustomerAddressInput,
  type BuyerShipToRegion,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { CHECKOUT_COUNTRIES } from "../checkout/checkout-countries"
import { customerAddressToInput } from "./account-settings-state"

export type AccountSettingsSlug = "addresses" | "payment-methods" | "country-region" | "coupons" | "following"

type RegionOption = Pick<BuyerShipToRegion, "id" | "zone" | "country_region_en" | "country_region_zh" | "country_code" | "abbreviation">

const fallbackShipToRegions: RegionOption[] = CHECKOUT_COUNTRIES.map((country) => ({
  id: `fallback_${country.code}`,
  zone: "Supported regions",
  country_region_en: country.name,
  country_region_zh: "",
  country_code: country.code,
  abbreviation: country.code.toUpperCase(),
})).sort((a, b) => a.country_region_en.localeCompare(b.country_region_en))

const normalizeCountryCode = (value: string) => value.trim().toLowerCase()

const uniqueRegionOptions = (regions: BuyerShipToRegion[]): RegionOption[] => {
  const seen = new Set<string>()
  return regions
    .filter((region) => region.enabled && !region.blocked)
    .filter((region) => {
      const code = normalizeCountryCode(region.country_code)
      if (!code || seen.has(code)) return false
      seen.add(code)
      return true
    })
    .map((region) => ({
      id: region.id,
      zone: region.zone,
      country_region_en: region.country_region_en,
      country_region_zh: region.country_region_zh,
      country_code: normalizeCountryCode(region.country_code),
      abbreviation: region.abbreviation,
    }))
    .sort((a, b) => a.zone.localeCompare(b.zone) || a.country_region_en.localeCompare(b.country_region_en))
}

const regionLabel = (region?: RegionOption) =>
  region?.country_region_en || region?.abbreviation || region?.country_code.toUpperCase() || "United States"

const selectedRegionLabels = (regions: RegionOption[], selectedCodes: string[]) => {
  const selected = new Set(selectedCodes)
  return regions.filter((region) => selected.has(region.country_code))
}

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

function CountryRegionPreferences() {
  const auth = useBuyerAuth()
  const current = readBuyerPreferences(auth.customer)
  const [regions, setRegions] = useState<RegionOption[]>(fallbackShipToRegions)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedCodes, setSelectedCodes] = useState<string[]>(current.countryCodes)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    let active = true
    setLoading(true)
    void fetchShipToRegions()
      .then((result) => {
        if (!active) return
        const options = uniqueRegionOptions(result.data)
        setRegions(options.length ? options : fallbackShipToRegions)
        setUsingFallback(result.source !== "backend" || !options.length)
      })
      .catch(() => {
        if (!active) return
        setRegions(fallbackShipToRegions)
        setUsingFallback(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const availableCodes = new Set(regions.map((region) => region.country_code))
    const normalizedSelected = selectedCodes.filter((code) => availableCodes.has(code))
    if (normalizedSelected.join("|") !== selectedCodes.join("|")) setSelectedCodes(normalizedSelected)
  }, [regions, selectedCodes])

  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes])
  const selectedRegionIds = regions.filter((region) => selectedSet.has(region.country_code)).map((region) => region.id)
  const selectedRegions = useMemo(() => selectedRegionLabels(regions, selectedCodes), [regions, selectedCodes])
  const normalizedQuery = query.trim().toLowerCase()
  const filteredRegions = useMemo(() => {
    if (!normalizedQuery) return regions
    return regions.filter((region) => [
      region.country_region_en,
      region.country_region_zh,
      region.country_code,
      region.abbreviation,
      region.zone,
    ].some((value) => value.toLowerCase().includes(normalizedQuery)))
  }, [normalizedQuery, regions])
  const groupedRegions = useMemo(() => filteredRegions.reduce<Record<string, RegionOption[]>>((groups, region) => {
    const zone = region.zone || "Other"
    groups[zone] = [...(groups[zone] ?? []), region]
    return groups
  }, {}), [filteredRegions])

  const toggleRegion = (region: RegionOption) => {
    const code = region.country_code
    setMessage(undefined)
    setSelectedCodes((currentCodes) => {
      if (currentCodes.includes(code)) {
        return currentCodes.filter((entry) => entry !== code)
      }
      return [...currentCodes, code]
    })
  }

  const selectAll = () => {
    setMessage(undefined)
    const allCodes = regions.map((region) => region.country_code)
    setSelectedCodes(allCodes)
  }

  const clearAll = () => {
    setMessage(undefined)
    setSelectedCodes([])
  }

  const removeSelectedRegion = (countryCode: string) => {
    setMessage(undefined)
    setSelectedCodes((currentCodes) => currentCodes.filter((code) => code !== countryCode))
  }

  const save = async () => {
    const nextSelected = selectedCodes
    const nextSelectedRegionIds = regions.filter((region) => nextSelected.includes(region.country_code)).map((region) => region.id)
    setSelectedCodes(nextSelected)
    setSaving(true)
    setMessage(undefined)
    try {
      await updateBuyerPreferences({
        countryCode: "",
        defaultCountryCode: "",
        countryCodes: nextSelected,
        shipToRegionIds: nextSelectedRegionIds,
        defaultShipToRegionId: undefined,
      })
      await auth.refreshCustomer()
      setMessage("Regions saved to your buyer account.")
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to save regions.") }
    finally { setSaving(false) }
  }

  return <SettingsFrame title="Country & region">
    <div className="buyer-region-preferences">
      <p className="buyer-account-setting-note">Choose the regions you commonly ship to. You will still select a specific delivery address at checkout.</p>
      <label className="buyer-region-search">
        <span>Search country or region</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search country or region" />
      </label>
      <div className="buyer-region-summary">
        <div><span>Selected regions</span><strong>{selectedCodes.length} selected</strong></div>
        <div><span>Checkout rule</span><strong>Address decides</strong></div>
      </div>
      <section className="buyer-region-selected-panel">
        <h2>Selected regions</h2>
        {selectedRegions.length ? (
          <div>
            {selectedRegions.map((region) => (
              <span key={region.id}>
                {regionLabel(region)} <small>{region.country_code.toUpperCase()}</small>
                <button
                  type="button"
                  aria-label={`Remove ${regionLabel(region)}`}
                  onClick={() => removeSelectedRegion(region.country_code)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p>No regions selected. Select at least one region before adding products to cart.</p>
        )}
      </section>
      {usingFallback ? <p className="buyer-account-warning">Showing a fallback region list because the live ship-to regions could not be loaded.</p> : null}
      <div className="buyer-region-actions">
        <Button variant="secondary" onClick={selectAll} disabled={loading || !regions.length}>Select all</Button>
        <Button variant="ghost" onClick={clearAll} disabled={loading}>Clear all</Button>
      </div>
      <div className="buyer-region-list" aria-busy={loading || saving}>
        {loading ? <LoadingState label="Loading supported regions..." /> : filteredRegions.length ? Object.entries(groupedRegions).map(([zone, zoneRegions]) => (
          <section key={zone} className="buyer-region-zone">
            <h2>{zone}</h2>
            {zoneRegions.map((region) => {
              const selected = selectedSet.has(region.country_code)
              return <article key={region.id} className={selected ? "selected" : ""}>
                <label>
                  <input type="checkbox" checked={selected} onChange={() => toggleRegion(region)} />
                  <span>
                    <strong>{region.country_region_en}</strong>
                    {region.country_region_zh ? <small>{region.country_region_zh}</small> : null}
                    <small>{[region.zone, region.country_code.toUpperCase(), region.abbreviation].filter(Boolean).join(" / ")}</small>
                  </span>
                </label>
                {selected ? <span className="buyer-region-selected-badge">Selected</span> : null}
              </article>
            })}
          </section>
        )) : <p className="buyer-account-empty-inline">No matching regions found.</p>}
      </div>
      <footer className="buyer-region-save">
        <Button loading={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save regions"}</Button>
      </footer>
      <p className="buyer-account-setting-note">Preferred regions help browsing and add-to-cart checks. Checkout availability still depends on the actual shipping address and product shipping regions.</p>
      {message ? <p className={message.startsWith("Regions saved") ? "buyer-account-success" : "buyer-account-error"} role="status">{message}</p> : null}
    </div>
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
  return <SettingsFrame title="Following stores">{loading ? <LoadingState label="Loading followed stores..." /> : error ? <p className="buyer-account-error">{error}</p> : following ? <div className="buyer-following-list"><article>{settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <span>{settings.brandName.slice(0, 1)}</span>}<div><h2>{settings.brandName}</h2><p>Following this store</p></div><Button href="/" variant="secondary">View stores</Button><Button variant="ghost" onClick={() => void updateStoreFollowState(false).then(() => setFollowing(false))}>Unfollow</Button></article></div> : <div className="buyer-account-empty-state"><span aria-hidden="true">♡</span><h2>No followed stores</h2><p>Stores you follow will appear here.</p><Button href="/">Browse stores</Button></div>}</SettingsFrame>
}

export function AccountSettingsPage({ cartCount, slug }: { cartCount: number; slug: AccountSettingsSlug }) {
  const auth = useBuyerAuth()
  const { settings, marketplaceMode } = useBuyerPageSettings({ marketplace: true })
  const content = useMemo(() => {
    if (slug === "addresses") return <AddressBook />
    if (slug === "payment-methods") return <PaymentMethodsPanel />
    if (slug === "country-region") return <CountryRegionPreferences />
    if (slug === "following") return <FollowingList settings={settings} />
    return <AccountCouponsEmpty />
  }, [settings, slug])

  return <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>{auth.isLoading ? <LoadingState label="Loading account settings..." /> : !auth.customer ? <AccountAuthRequired /> : <section className="buyer-account-layout"><AccountNavigation customer={auth.customer} onSignOut={() => void auth.signOut().then(() => window.location.assign("/store"))} onSwitchAccount={() => void auth.signOut().then(() => window.location.assign("/account/sign-in"))} />{content}</section>}</AccountAuthLayout>
}
