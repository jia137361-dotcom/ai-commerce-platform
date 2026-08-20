import { useEffect, useState, type FormEvent } from "react"
import QRCode from "qrcode"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { AccountAuthRequired } from "../../components/account/AccountAuthRequired"
import { AccountNavigation } from "../../components/account/AccountNavigation"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { LoadingState } from "../../components/ui/States"
import {
  claimBuyerReferralCode,
  fetchBuyerReferralDashboard,
  formatBuyerMoney,
  type BuyerReferralDashboard,
} from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"

const commissionStatus = (status: string) => ({
  pending: "Pending",
  released: "Released",
  order_cancelled: "Order Cancelled",
  order_refund: "Order Refund",
  cancelled: "Cancelled",
  frozen: "Under review",
  expired: "Expired",
}[status] ?? status)

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value))

function ReferralPanel() {
  const [dashboard, setDashboard] = useState<BuyerReferralDashboard>()
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string }>()
  const [qrCode, setQrCode] = useState("")
  const [emails, setEmails] = useState("")
  const [claimCode, setClaimCode] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      setDashboard(await fetchBuyerReferralDashboard())
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to load referrals." })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (!dashboard?.profile.referral_link) return
    void QRCode.toDataURL(dashboard.profile.referral_link, { width: 280, margin: 2 }).then(setQrCode)
  }, [dashboard?.profile.referral_link])

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setNotice({ kind: "success", text: `${label} copied.` })
    } catch {
      setNotice({ kind: "error", text: "Copy failed. Select the value and copy it manually." })
    }
  }

  const share = async (channel: string) => {
    if (!dashboard) return
    const link = dashboard.profile.referral_link
    const text = `Create AI custom-print products with CiiVerse. Use my referral code ${dashboard.profile.referral_code}: ${link}`
    const destinations: Record<string, string> = {
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      Instagram: "https://www.instagram.com/",
      TikTok: "https://www.tiktok.com/",
      YouTube: "https://www.youtube.com/",
    }
    await copy(text, `${channel} share text`)
    window.open(destinations[channel], "_blank", "noopener,noreferrer")
  }

  const sendEmail = (event: FormEvent) => {
    event.preventDefault()
    if (!dashboard || !emails.trim()) return
    const subject = "Try CiiVerse AI custom-print products"
    const body = `Use my referral link ${dashboard.profile.referral_link} or code ${dashboard.profile.referral_code}.`
    window.location.href = `mailto:${emails.split(",").map((email) => email.trim()).filter(Boolean).join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const claim = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await claimBuyerReferralCode(claimCode, "code")
      setClaimCode("")
      setNotice({ kind: "success", text: "Referral code applied to your account." })
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to apply referral code." })
    }
  }

  if (loading) return <LoadingState label="Loading referral program..." />
  if (!dashboard) return <Card as="section" className="buyer-referral-card"><p className="buyer-account-error">{notice?.text ?? "Referral program is unavailable."}</p><Button variant="secondary" onClick={() => void load()}>Retry</Button></Card>

  return <div className="buyer-referral-content">
    <Card as="section" className="buyer-referral-card buyer-referral-overview">
      <header><div><p className="buyer-account-kicker">Refer a friend</p><h1>Share and earn</h1></div><Button href="/affiliates/customized-products" variant="secondary">Program details</Button></header>
      <div className="buyer-referral-summary">
        <div><span>Friends referred</span><strong>{dashboard.summary.referred_customers}</strong></div>
        <div><span>Pending</span><strong>{formatBuyerMoney(dashboard.summary.pending_amount, "USD")}</strong></div>
        <div><span>Released</span><strong>{formatBuyerMoney(dashboard.summary.released_amount, "USD")}</strong></div>
      </div>
      {notice ? <p className={notice.kind === "success" ? "buyer-account-success" : "buyer-account-error"} role="status">{notice.text}</p> : null}
    </Card>

    <Card as="section" className="buyer-referral-card">
      <h2>Invite friends through email</h2>
      <form className="buyer-referral-email" onSubmit={sendEmail}>
        <input type="text" value={emails} onChange={(event) => setEmails(event.target.value)} placeholder="Add email addresses" aria-label="Email addresses" />
        <Button type="submit" disabled={!emails.trim()}>Send</Button>
      </form>
      <small>Separate multiple email addresses with commas.</small>
    </Card>

    <Card as="section" className="buyer-referral-card">
      <h2>Share your personal referral link or referral code</h2>
      <div className="buyer-referral-copy-row"><input readOnly value={dashboard.profile.referral_link} aria-label="Personal referral link" /><Button onClick={() => void copy(dashboard.profile.referral_link, "Referral link")}>Copy link</Button></div>
      <div className="buyer-referral-copy-row"><input readOnly value={dashboard.profile.referral_code} aria-label="Personal referral code" /><Button variant="secondary" onClick={() => void copy(dashboard.profile.referral_code, "Referral code")}>Copy code</Button></div>
      <div className="buyer-referral-share" aria-label="Share referral link">
        {["Facebook", "Instagram", "TikTok", "YouTube"].map((channel) => <Button key={channel} variant="outline" onClick={() => void share(channel)}>{channel}</Button>)}
        <Button variant="outline" onClick={() => qrCode && window.open(qrCode, "_blank", "noopener,noreferrer")}>QR Code</Button>
      </div>
      {qrCode ? <div className="buyer-referral-qr"><img src={qrCode} alt="QR code for personal referral link" /><span>Scan to open your invitation link</span></div> : null}
    </Card>

    <Card as="section" className="buyer-referral-card">
      <h2>Have a referral code?</h2>
      <form className="buyer-referral-claim" onSubmit={claim}><input value={claimCode} onChange={(event) => setClaimCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="Enter referral code" aria-label="Referral code" /><Button type="submit" variant="secondary" disabled={claimCode.length < 6}>Apply</Button></form>
      <small>A code can be applied once, before referred purchases are recorded.</small>
    </Card>

    <Card as="section" className="buyer-referral-card">
      <h2>Friends referred</h2>
      {dashboard.referred_customers.length ? <div className="buyer-referral-activity">{dashboard.referred_customers.map((customer) => <article key={`${customer.id}:${customer.attributed_at}`}>
        <div><strong>{customer.display_name}</strong><span>{customer.email_masked ?? "Email hidden"} · Joined {formatDate(customer.attributed_at)}</span></div>
        <div><strong>{customer.first_successful_order_at ? "Purchased" : "Registered"}</strong><span className={`buyer-referral-status buyer-referral-status--${customer.status}`}>{customer.status}</span></div>
      </article>)}</div> : <p className="buyer-wallet-empty-copy">Friends who register with your link or code will appear here.</p>}
    </Card>

    <Card as="section" className="buyer-referral-card">
      <h2>Commission activity</h2>
      {dashboard.commissions.length ? <div className="buyer-referral-activity">{dashboard.commissions.map((commission) => <article key={commission.id}>
        <div><strong>{commission.order_display_id ? `Order #${commission.order_display_id}` : "Referred order"}</strong><span>{formatDate(commission.order_created_at)} · {commission.rate_percent}% rate</span></div>
        <div><strong>{formatBuyerMoney(commission.commission_amount, commission.currency_code)}</strong><span className={`buyer-referral-status buyer-referral-status--${commission.status}`}>{commissionStatus(commission.status)}</span></div>
      </article>)}</div> : <p className="buyer-wallet-empty-copy">No referred orders yet.</p>}
    </Card>
  </div>
}

export function AccountReferralPage({ cartCount }: { cartCount: number }) {
  const auth = useBuyerAuth()
  const { settings, marketplaceMode } = useBuyerPageSettings()
  return <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>{auth.isLoading ? <LoadingState label="Loading buyer account..." /> : !auth.customer ? <AccountAuthRequired /> : <section className="buyer-account-layout"><AccountNavigation customer={auth.customer} onSignOut={() => void auth.signOut().then(() => window.location.assign("/store"))} onSwitchAccount={() => void auth.signOut().then(() => window.location.assign("/account/sign-in"))} /><ReferralPanel /></section>}</AccountAuthLayout>
}
