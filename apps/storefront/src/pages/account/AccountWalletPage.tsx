import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { AccountAuthRequired } from "../../components/account/AccountAuthRequired"
import { AccountNavigation } from "../../components/account/AccountNavigation"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { LoadingState } from "../../components/ui/States"
import { createBuyerWalletWithdrawal, fetchBuyerWallet, formatBuyerMoney, type BuyerWallet } from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"

const formatDate = (value: string) => new Intl.DateTimeFormat("en-HK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
const statusLabel = (status: string) => ({
  paid: "Paid",
  completed: "Paid",
  processing: "Processing",
  pending: "Pending merchant review",
  approved: "Approved for monthly payout",
  failed: "Failed",
  rejected: "Rejected",
  available: "Available",
}[status] ?? status)

function WalletPanel() {
  const [wallet, setWallet] = useState<BuyerWallet>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState("")
  const [currencyCode, setCurrencyCode] = useState("")
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string }>()
  const submittingRef = useRef(false)

  const load = async () => {
    try {
      setWallet(await fetchBuyerWallet())
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Unable to load wallet." })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (!currencyCode && wallet?.balances.length) {
      const payoutCurrency = wallet.balances.find((balance) => balance.currency_code === wallet.payout_currency_code)
      const preferred = wallet.balances.find((balance) => balance.currency_code === wallet.preferred_currency)
      setCurrencyCode((payoutCurrency ?? preferred ?? wallet.balances[0]).currency_code)
    }
  }, [currencyCode, wallet])

  const selectedBalance = useMemo(() => wallet?.balances.find((balance) => balance.currency_code === currencyCode), [currencyCode, wallet])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!currencyCode || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setMessage(undefined)
    try {
      const requestId = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `withdraw_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const result = await createBuyerWalletWithdrawal(Number(amount), currencyCode, requestId)
      setWallet(result.wallet)
      setAmount("")
      setMessage({ kind: "success", text: "Withdrawal request submitted for merchant review." })
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Unable to withdraw." })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Loading wallet..." />
  if (!wallet) return <Card as="section" className="buyer-wallet-panel"><p className="buyer-account-error">{message?.text ?? "Wallet is unavailable."}</p><Button variant="secondary" onClick={() => { setLoading(true); void load() }}>Retry</Button></Card>
  const balanceActivity = wallet.ledger.filter((entry) => entry.affects_balance)

  return <div className="buyer-wallet-content">
    <Card as="section" className="buyer-wallet-panel">
      <header className="buyer-wallet-header"><div><p className="buyer-account-kicker">Cashback wallet</p><h1>Wallet balance</h1></div><span className={`buyer-wallet-mode buyer-wallet-mode--${wallet.payout_mode}`}>{wallet.payout_mode === "mock" ? "Demo payouts" : wallet.payout_mode === "sandbox" ? "PayPal sandbox" : "Payouts disabled"}</span></header>
      <div className="buyer-wallet-balances">{wallet.balances.length ? wallet.balances.map((balance) => <button type="button" className={currencyCode === balance.currency_code ? "selected" : ""} key={balance.currency_code} onClick={() => setCurrencyCode(balance.currency_code)}><small>{balance.currency_code.toUpperCase()}</small><strong>{formatBuyerMoney(balance.amount, balance.currency_code)}</strong></button>) : <div className="buyer-wallet-empty"><strong>No cashback yet</strong><span>Cashback from stores will appear here.</span></div>}</div>
    </Card>

    <Card as="section" className="buyer-wallet-panel">
      <h2>Withdraw to PayPal</h2>
      {wallet.paypal_account_bound ? <p className="buyer-wallet-paypal">PayPal account <strong>{wallet.paypal_email_masked}</strong></p> : <p className="buyer-wallet-paypal">Connect a PayPal account before requesting a withdrawal.</p>}
      <form className="buyer-wallet-withdraw-form" onSubmit={submit}>
        <label><span>Amount</span><input type="number" min={wallet.minimum_withdrawal} max={selectedBalance?.amount ?? 0} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={String(wallet.minimum_withdrawal)} required /></label>
        <label><span>Currency</span><select value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} disabled>{wallet.balances.map((balance) => <option key={balance.currency_code} value={balance.currency_code}>{balance.currency_code.toUpperCase()}</option>)}</select></label>
        <Button type="submit" loading={submitting} disabled={!wallet.paypal_account_bound || wallet.payout_mode === "disabled" || currencyCode !== wallet.payout_currency_code || !selectedBalance?.withdrawal_supported || Number(amount) < wallet.minimum_withdrawal}>Request withdrawal</Button>
      </form>
      <div className="buyer-wallet-withdraw-meta"><span>Minimum {formatBuyerMoney(wallet.minimum_withdrawal, wallet.payout_currency_code)}</span><span>Estimated fee {wallet.withdrawal_fee_rate_percent}% (max {formatBuyerMoney(wallet.withdrawal_fee_cap, wallet.payout_currency_code)})</span><span>Available {formatBuyerMoney(selectedBalance?.amount ?? 0, currencyCode || wallet.payout_currency_code)}</span></div>
      <p className="buyer-wallet-paypal">Merchant-approved requests are paid on the 20th each month ({wallet.payout_schedule.timezone}). Requests submitted after the settlement run roll into the next month.</p>
      {currencyCode && currencyCode !== wallet.payout_currency_code ? <p className="buyer-account-error">PayPal withdrawals must use {wallet.payout_currency_code.toUpperCase()}.</p> : null}
      {selectedBalance && !selectedBalance.withdrawal_supported ? <p className="buyer-account-error">PayPal Payouts does not support {selectedBalance.currency_code.toUpperCase()}. Future credits should use a supported payout currency.</p> : null}
      {!wallet.paypal_account_bound ? <Button href="/account/payment-methods" variant="secondary">Connect PayPal</Button> : null}
      {message ? <p className={message.kind === "success" ? "buyer-account-success" : "buyer-account-error"} role="status">{message.text}</p> : null}
    </Card>

    <Card as="section" className="buyer-wallet-panel">
      <h2>Wallet activity</h2>
      {balanceActivity.length ? <div className="buyer-wallet-activity">{balanceActivity.map((entry) => {
        const amountPrefix = entry.type === "cashback_credit" ? "+" : "-"
        return <article key={entry.id}><div><strong>{entry.description || (entry.type === "cashback_credit" ? "Cashback" : "Withdrawal")}</strong><span>{formatDate(entry.created_at)}</span></div><div><strong className={entry.type === "withdrawal_debit" ? "debit" : "credit"}>{amountPrefix}{formatBuyerMoney(entry.amount, entry.currency_code)}</strong><span>{statusLabel(entry.status)}</span></div></article>
      })}</div> : <p className="buyer-wallet-empty-copy">No wallet activity.</p>}
    </Card>

    {wallet.withdrawals.length ? <Card as="section" className="buyer-wallet-panel"><h2>Withdrawals</h2><div className="buyer-wallet-activity">{wallet.withdrawals.map((withdrawal) => <article key={withdrawal.id}><div><strong>{withdrawal.paypal_email_masked}</strong><span>{formatDate(withdrawal.created_at)}{withdrawal.error_message ? ` · ${withdrawal.error_message}` : ""}</span></div><div><strong>{formatBuyerMoney(withdrawal.payout_amount, withdrawal.currency_code)} payout{withdrawal.fee !== null ? ` · Fee ${formatBuyerMoney(withdrawal.fee, withdrawal.currency_code)}` : ""}</strong><span>{statusLabel(withdrawal.status)}</span></div></article>)}</div></Card> : null}
  </div>
}

export function AccountWalletPage({ cartCount }: { cartCount: number }) {
  const auth = useBuyerAuth()
  const { settings, marketplaceMode } = useBuyerPageSettings()
  return <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>{auth.isLoading ? <LoadingState label="Loading buyer account..." /> : !auth.customer ? <AccountAuthRequired /> : <section className="buyer-account-layout"><AccountNavigation customer={auth.customer} onSignOut={() => void auth.signOut().then(() => window.location.assign("/store"))} onSwitchAccount={() => void auth.signOut().then(() => window.location.assign("/account/sign-in"))} /><WalletPanel /></section>}</AccountAuthLayout>
}
