import { useEffect, useState } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { ErrorState, LoadingState } from "../../components/ui/States"
import {
  fetchBuyerStoreMessages,
  getScopedBuyerStoreId,
  sendBuyerStoreMessage,
  type BuyerStoreMessage,
} from "../../lib/buyer-api"
import { buildStoreMessagesHref } from "../../lib/storefront-links"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"

type StoreMessagesPageProps = {
  cartCount: number
  orderId?: string
  storeId?: string
}

const readStoreIdFromUrl = () => {
  if (typeof window === "undefined") return undefined
  return new URLSearchParams(window.location.search).get("store_id")?.trim() || undefined
}

export function StoreMessagesPage({ cartCount, orderId, storeId }: StoreMessagesPageProps) {
  const auth = useBuyerAuth()
  const [requestedStoreId] = useState(() => storeId?.trim() || readStoreIdFromUrl() || getScopedBuyerStoreId())
  const { settings, marketplaceMode } = useBuyerPageSettings({ storeId: requestedStoreId })
  const [messages, setMessages] = useState<BuyerStoreMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const messageStoreId = settings.storeId?.trim() || requestedStoreId

  useEffect(() => {
    if (!auth.customer) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError(undefined)
    void fetchBuyerStoreMessages({ storeId: messageStoreId })
      .then((next) => {
        if (active) setMessages(next)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load messages")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [auth.customer?.id, messageStoreId])

  const submit = async () => {
    const body = draft.trim()
    if (!body) return
    setSending(true)
    setError(undefined)
    try {
      await sendBuyerStoreMessage({ body, orderId, storeId: messageStoreId })
      setDraft("")
      const next = await fetchBuyerStoreMessages({ storeId: messageStoreId })
      setMessages(next)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <PageShell
      className="buyer-messages-page"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
      footer={<StoreFooter />}
      cartCount={cartCount}
    >
      <header className="buyer-messages-header">
        <h1>Messages with {settings.brandName}</h1>
        <p className="buyer-order-muted"><a href="/account">Account</a> · Store conversation</p>
        {orderId ? <p className="buyer-order-muted">Linked to order {orderId}</p> : null}
      </header>

      {auth.isLoading ? (
        <LoadingState label="Checking account session..." />
      ) : !auth.customer ? (
        <Card as="section" className="buyer-messages-auth">
          <h2>Sign in to message the seller</h2>
          <p>Your conversation history stays tied to your buyer account.</p>
          <Button href={`/account/sign-in?returnTo=${encodeURIComponent(buildStoreMessagesHref(messageStoreId, orderId))}`}>
            Sign in
          </Button>
        </Card>
      ) : loading ? (
        <LoadingState label="Loading messages..." />
      ) : error && !messages.length ? (
        <ErrorState title="Messages unavailable" message={error} action={{ label: "Retry", onClick: () => window.location.reload() }} />
      ) : (
        <section className="buyer-messages-thread">
          <div className="buyer-messages-list" aria-live="polite">
            {messages.length ? messages.map((message) => (
              <article
                key={message.id}
                className={message.senderRole === "buyer" ? "buyer-message buyer-message-outgoing" : "buyer-message buyer-message-incoming"}
              >
                <strong>{message.senderRole === "buyer" ? "You" : settings.brandName}</strong>
                <p>{message.body}</p>
                <small>{message.createdAt ? new Date(message.createdAt).toLocaleString() : "Just now"}</small>
              </article>
            )) : (
              <p className="buyer-order-muted">No messages yet. Ask the seller about delivery, sizing, or order updates.</p>
            )}
          </div>
          <form
            className="buyer-messages-compose"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <label>
              Message
              <textarea
                value={draft}
                maxLength={2000}
                rows={4}
                placeholder="Write your message to the seller..."
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={sending || !draft.trim()}>
              {sending ? "Sending..." : "Send message"}
            </Button>
            {error ? <p role="alert" className="buyer-order-error">{error}</p> : null}
          </form>
        </section>
      )}
    </PageShell>
  )
}
