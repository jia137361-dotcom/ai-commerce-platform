export type ShareChannelType = "web_share_url" | "mailto" | "copy" | "copy_then_open"

export type ShareChannel = {
  enabled?: boolean
  type?: ShareChannelType
  url?: string
  value?: string
  message?: string
}

export type ShareChannelKey =
  | "wechat"
  | "whatsapp"
  | "x"
  | "tiktok"
  | "copy_link"
  | "facebook"
  | "telegram"
  | "email"
  | "instagram"
  | "pinterest"

/** Compact product/store share row — no WeChat; Twitter/X + Facebook first. */
export const PRIMARY_SHARE_CHANNELS: ShareChannelKey[] = [
  "x",
  "facebook",
  "whatsapp",
  "tiktok",
  "copy_link",
]

export const SHARE_CHANNEL_LABELS: Record<ShareChannelKey, string> = {
  wechat: "WeChat",
  whatsapp: "WhatsApp",
  x: "Twitter",
  tiktok: "TikTok",
  copy_link: "Copy link",
  facebook: "Facebook",
  telegram: "Telegram",
  email: "Email",
  instagram: "Instagram",
  pinterest: "Pinterest",
}

export const buildShareText = (title: string, pageUrl: string) => `${title} ${pageUrl}`

export const buildShareChannels = (input: {
  pageUrl: string
  title: string
  imageUrl?: string | null
}): Record<ShareChannelKey, ShareChannel> => {
  const encodedUrl = encodeURIComponent(input.pageUrl)
  const encodedTitle = encodeURIComponent(input.title)
  const encodedImage = input.imageUrl ? encodeURIComponent(input.imageUrl) : null
  const shareText = buildShareText(input.title, input.pageUrl)

  return {
    wechat: {
      enabled: true,
      type: "copy_then_open",
      value: shareText,
      message: "Link copied. Paste it into WeChat to share.",
    },
    whatsapp: {
      enabled: true,
      type: "web_share_url",
      url: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    x: {
      enabled: true,
      type: "web_share_url",
      url: `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`,
    },
    tiktok: {
      enabled: true,
      type: "copy_then_open",
      value: input.pageUrl,
      message: "Link copied. Open TikTok and paste the link in your post or bio.",
    },
    copy_link: {
      enabled: true,
      type: "copy",
      value: input.pageUrl,
    },
    facebook: {
      enabled: true,
      type: "web_share_url",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    telegram: {
      enabled: true,
      type: "web_share_url",
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    email: {
      enabled: true,
      type: "mailto",
      url: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
    instagram: {
      enabled: true,
      type: "copy_then_open",
      value: input.pageUrl,
      message: "Link copied. Open Instagram and paste the link in your story or bio.",
    },
    pinterest: {
      enabled: true,
      type: "web_share_url",
      url: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${encodedImage ? `&media=${encodedImage}` : ""}`,
    },
  }
}
