const ISO_SHIPPING_COUNTRY_CODES = `af ax al dz as ad ao ai ag ar am aq aw au at az bs bh bd bb be bz bj bm bt bo bq ba bw bv br io vg bn bg bf bi cv kh cm ca ky cf td cl cn cx cc co km kr cg cd ck cr ci hr cw cy cz dk dj dm do ec eg sv gq er ee sz et fk fo fj fi fr gf pf tf ga gm ge de gh gi gr gl gd gp gu gt gg gn gw gy ht hm va hn hk hu is in id iq ie im il it jm jp je jo kz ke ki kw kg la lv lb ls lr ly li lt lu mo mg mw my mv ml mt mh mq mr mu yt mx fm md mc mn me ms ma mz mm na nr np nl nc nz ni ne ng nu nf mk mp no om pk pw ps pa pg py pe ph pn pl pt pr qa re ro rw bl sh kn lc mf pm vc ws sm st sa sn rs sc sl sg sx sk si sb so za gs ss es lk sd sr sj se ch tw tj tz th tl tg tk to tt tn tr tm tc tv ug ua ae gb um us vi uy uz vu ve vn wf eh ye zm zw`

const countryNames = new Intl.DisplayNames(["en"], { type: "region" })
const priorityCodes = ["us", "cn", "gb", "ca", "au", "de", "fr", "it", "jp", "sg", "my"]
const allCodes = ISO_SHIPPING_COUNTRY_CODES.split(" ")

export const CHECKOUT_COUNTRIES = [
  ...priorityCodes,
  ...allCodes.filter((code) => !priorityCodes.includes(code)).sort((left, right) =>
    (countryNames.of(left.toUpperCase()) ?? left).localeCompare(countryNames.of(right.toUpperCase()) ?? right)
  ),
].map((code) => ({
  code,
  name: countryNames.of(code.toUpperCase()) ?? code.toUpperCase(),
}))

export const isCheckoutCountryCode = (value: string) =>
  CHECKOUT_COUNTRIES.some((country) => country.code === value.toLowerCase())

export const shippingUnavailableMessage = (error?: unknown) => {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : ""
  if (/shipping options?.*do not have a price|shipping option.*price/i.test(message)) {
    return "Shipping method unavailable for this cart/address. Choose another country or contact the store."
  }
  if (/ShippingMethod with id .+ not found/i.test(message)) {
    return "Shipping selection was interrupted. Save the address again or re-select a delivery method."
  }
  return message || "Shipping method unavailable for this cart/address. Choose another country or contact the store."
}
