import { useState } from "react"
import {
  PRIMARY_SHARE_CHANNELS,
  SHARE_CHANNEL_LABELS,
  type ShareChannel,
  type ShareChannelKey,
} from "../../lib/share-channels"

type ShareChannelsPanelProps = {
  title: string
  pageUrl: string
  shareText: string
  channels: Partial<Record<ShareChannelKey, ShareChannel>>
  heading?: string
  compact?: boolean
  className?: string
}

const channelIcon = (key: ShareChannelKey) => {
  switch (key) {
    case "wechat":
      return "微"
    case "whatsapp":
      return "WA"
    case "x":
      return "X"
    case "tiktok":
      return "TT"
    case "copy_link":
      return "⎘"
    case "facebook":
      return "f"
    case "telegram":
      return "TG"
    case "email":
      return "@"
    case "instagram":
      return "IG"
    case "pinterest":
      return "P"
    default:
      return "↗"
  }
}

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const input = document.createElement("textarea")
  input.value = value
  input.setAttribute("readonly", "true")
  input.style.position = "absolute"
  input.style.left = "-9999px"
  document.body.appendChild(input)
  input.select()
  document.execCommand("copy")
  document.body.removeChild(input)
}

export function ShareChannelsPanel({
  title,
  pageUrl,
  shareText,
  channels,
  heading = "Share",
  compact = false,
  className = "",
}: ShareChannelsPanelProps) {
  const [status, setStatus] = useState("")

  const handleShare = async (key: ShareChannelKey, channel: ShareChannel) => {
    if (channel.enabled === false) return

    setStatus("")
    const type = channel.type ?? "copy"

    if (type === "web_share_url" && channel.url) {
      window.open(channel.url, "_blank", "noopener,noreferrer")
      return
    }

    if (type === "mailto" && channel.url) {
      window.location.href = channel.url
      return
    }

    const copyValue =
      key === "wechat"
        ? shareText
        : channel.value ?? (type === "copy" ? pageUrl : shareText)

    try {
      await copyText(copyValue)
      if (type === "copy_then_open") {
        setStatus(channel.message ?? "Link copied.")
      } else {
        setStatus("Link copied.")
      }
    } catch {
      setStatus("Unable to copy link on this device.")
    }
  }

  const visibleKeys = PRIMARY_SHARE_CHANNELS.filter((key) => channels[key]?.enabled !== false)

  return (
    <section
      className={`buyer-share-panel${compact ? " buyer-share-panel--compact" : ""} ${className}`.trim()}
      aria-label={heading}
    >
      {!compact ? <h3 className="buyer-share-panel-heading">{heading}</h3> : null}
      <div className="buyer-share-options" role="group" aria-label={`${heading} options`}>
        {visibleKeys.map((key) => {
          const channel = channels[key]
          if (!channel) return null
          return (
            <button
              key={key}
              type="button"
              className={`buyer-share-option buyer-share-option--${key}`}
              onClick={() => void handleShare(key, channel)}
              aria-label={`Share on ${SHARE_CHANNEL_LABELS[key]}`}
            >
              <span aria-hidden="true">{channelIcon(key)}</span>
              <strong>{SHARE_CHANNEL_LABELS[key]}</strong>
            </button>
          )
        })}
      </div>
      {status ? (
        <p className="buyer-share-panel-status" role="status">
          {status}
        </p>
      ) : null}
      {!compact ? (
        <p className="buyer-share-panel-copy">
          Share <strong>{title}</strong> on social apps or copy the link.
        </p>
      ) : null}
    </section>
  )
}
