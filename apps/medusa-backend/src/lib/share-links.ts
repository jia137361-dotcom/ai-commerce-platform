// 商品分享链接构建工具
// 纯函数，无 DB 依赖，不调用第三方 API

/** 分享渠道类型，前端根据 type 决定渲染方式 */
export type ShareChannelType = "web_share_url" | "mailto" | "copy" | "copy_then_open"

/** 单个分享渠道的数据 */
export interface ShareChannel {
  enabled: boolean
  type: ShareChannelType
  url?: string    // web_share_url / mailto 类型使用
  value?: string  // copy / copy_then_open 类型使用
  message?: string // copy_then_open 类型使用，前端展示提示文案
}

/** 所有分享渠道的集合 */
export interface ShareChannels {
  wechat: ShareChannel
  facebook: ShareChannel
  x: ShareChannel
  pinterest: ShareChannel
  whatsapp: ShareChannel
  telegram: ShareChannel
  email: ShareChannel
  copy_link: ShareChannel
  instagram: ShareChannel
  tiktok: ShareChannel
}

/** buildShareLinks 的输入参数 */
export interface ShareLinkInput {
  productUrl: string   // 完整商品页 URL
  title: string        // 商品标题
  imageUrl: string | null // 商品图片 URL，nullable
}

/** 分享文案：标题 + 空格 + URL */
export const buildShareText = (title: string, productUrl: string): string => {
  return `${title} ${productUrl}`
}

/** 构建所有渠道的分享数据 */
export const buildShareLinks = (input: ShareLinkInput): ShareChannels => {
  const encodedUrl = encodeURIComponent(input.productUrl)
  const encodedTitle = encodeURIComponent(input.title)
  const encodedImage = input.imageUrl ? encodeURIComponent(input.imageUrl) : null
  const shareText = buildShareText(input.title, input.productUrl)

  return {
    // WeChat — 浏览器无法直接唤起分享，复制标题+链接后粘贴到微信
    wechat: {
      enabled: true,
      type: "copy_then_open",
      value: shareText,
      message: "Link copied. Paste it into WeChat to share.",
    },

    // Facebook — 使用 sharer.php，无需 appId
    facebook: {
      enabled: true,
      type: "web_share_url",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    },

    // X (Twitter) — 使用 intent/post，旧域名自动重定向
    x: {
      enabled: true,
      type: "web_share_url",
      url: `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`
    },

    // Pinterest — 需要 image 参数展示商品图
    pinterest: {
      enabled: true,
      type: "web_share_url",
      url: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${encodedImage ? `&media=${encodedImage}` : ""}`
    },

    // WhatsApp — 文本分享
    whatsapp: {
      enabled: true,
      type: "web_share_url",
      url: `https://wa.me/?text=${encodedTitle}%20-%20${encodedUrl}`
    },

    // Telegram — URL + 文本分享
    telegram: {
      enabled: true,
      type: "web_share_url",
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
    },

    // Email — mailto: 协议
    email: {
      enabled: true,
      type: "mailto",
      url: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`
    },

    // 复制链接 — 返回原始 URL，前端用 navigator.clipboard.writeText(value)
    copy_link: {
      enabled: true,
      type: "copy",
      value: input.productUrl
    },

    // Instagram 不支持直接 web 分享，前端展示提示 + 复制链接按钮
    instagram: {
      enabled: true,
      type: "copy_then_open",
      value: input.productUrl,
      message: "Instagram does not support direct web sharing. Copy link and open Instagram."
    },

    // TikTok 不支持直接 web 分享，前端展示提示 + 复制链接按钮
    tiktok: {
      enabled: true,
      type: "copy_then_open",
      value: input.productUrl,
      message: "TikTok does not support direct web sharing. Copy link and open TikTok."
    }
  }
}
