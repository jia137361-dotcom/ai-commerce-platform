import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export type BuyerLocale = "en" | "zh"

const STORAGE_KEY = "citigoo:buyer-locale"

const messages = {
  en: {
    shipTo: "Ship to",
    stores: "Stores",
    locals: "Locals",
    support: "Support",
    ordersAccount: "Orders & Account",
    buyerAccount: "Buyer Account",
    signIn: "Sign in",
    follow: "Follow",
    following: "Following",
    message: "Message",
    officialStore: "Official store · Secure checkout",
    newsletter: "Newsletter",
    newsletterPlaceholder: "Email address",
    newsletterJoin: "Join",
    newsletterSuccess: "Thanks for subscribing.",
    newsletterError: "Unable to subscribe.",
    localeLabel: "EN",
    localeAlt: "中文",
    checkoutSignIn: "Sign in to continue checkout",
    guestCheckoutHint: "Guest checkout uses your contact email. Sign in to save order history.",
  },
  zh: {
    shipTo: "配送至",
    stores: "店铺",
    locals: "本地",
    support: "客服",
    ordersAccount: "订单与账户",
    buyerAccount: "买家账户",
    signIn: "登录",
    follow: "关注",
    following: "已关注",
    message: "联系",
    officialStore: "官方店铺 · 安全结账",
    newsletter: "邮件订阅",
    newsletterPlaceholder: "邮箱地址",
    newsletterJoin: "订阅",
    newsletterSuccess: "订阅成功。",
    newsletterError: "订阅失败。",
    localeLabel: "中文",
    localeAlt: "EN",
    checkoutSignIn: "登录后继续结账",
    guestCheckoutHint: "访客结账将使用您填写的联系邮箱。登录后可保存订单历史。",
  },
} as const

export type BuyerMessageKey = keyof typeof messages.en

type BuyerLocaleContextValue = {
  locale: BuyerLocale
  t: (key: BuyerMessageKey) => string
  toggleLocale: () => void
}

const BuyerLocaleContext = createContext<BuyerLocaleContextValue | null>(null)

const readInitialLocale = (): BuyerLocale => {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === "zh" ? "zh" : "en"
}

export function BuyerLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<BuyerLocale>(() => readInitialLocale())

  const toggleLocale = useCallback(() => {
    setLocale((current) => {
      const next: BuyerLocale = current === "en" ? "zh" : "en"
      window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      locale,
      toggleLocale,
      t: (key: BuyerMessageKey) => messages[locale][key],
    }),
    [locale, toggleLocale]
  )

  return <BuyerLocaleContext.Provider value={value}>{children}</BuyerLocaleContext.Provider>
}

export function useBuyerLocale() {
  const ctx = useContext(BuyerLocaleContext)
  if (!ctx) throw new Error("useBuyerLocale must be used within BuyerLocaleProvider")
  return ctx
}
