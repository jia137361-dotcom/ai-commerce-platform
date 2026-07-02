import { buildShareLinks, buildShareText } from "../lib/share-links"

describe("buildShareText", () => {
  it("组合标题和 URL", () => {
    const text = buildShareText("Cool T-Shirt", "https://example.com/products/prod_abc")
    expect(text).toBe("Cool T-Shirt https://example.com/products/prod_abc")
  })
})

describe("buildShareLinks", () => {
  const input = {
    productUrl: "https://example.com/products/prod_abc",
    title: "Cool T-Shirt",
    imageUrl: "https://example.com/images/tshirt.png"
  }

  it("返回全部 10 个渠道", () => {
    const channels = buildShareLinks(input)
    const keys = Object.keys(channels).sort()
    expect(keys).toEqual([
      "copy_link", "email", "facebook", "instagram",
      "pinterest", "telegram", "tiktok", "wechat", "whatsapp", "x"
    ])
  })

  describe("web_share_url 类型渠道", () => {
    it("facebook — 使用 sharer.php 生成分享 URL", () => {
      const channels = buildShareLinks(input)
      expect(channels.facebook.type).toBe("web_share_url")
      expect(channels.facebook.enabled).toBe(true)
      expect(channels.facebook.url).toContain("facebook.com/sharer/sharer.php?u=")
      expect(channels.facebook.url).toContain(encodeURIComponent(input.productUrl))
    })

    it("x — 使用 intent/post 生成分享 URL", () => {
      const channels = buildShareLinks(input)
      expect(channels.x.type).toBe("web_share_url")
      expect(channels.x.url).toContain("x.com/intent/post")
      expect(channels.x.url).toContain("url=")
      expect(channels.x.url).toContain("text=")
    })

    it("pinterest — 包含 url + description + media 参数", () => {
      const channels = buildShareLinks(input)
      expect(channels.pinterest.type).toBe("web_share_url")
      expect(channels.pinterest.url).toContain("pinterest.com/pin/create/button/")
      expect(channels.pinterest.url).toContain("url=")
      expect(channels.pinterest.url).toContain("description=")
      expect(channels.pinterest.url).toContain("media=")
    })

    it("pinterest — imageUrl 为 null 时不包含 media 参数", () => {
      const channels = buildShareLinks({ ...input, imageUrl: null })
      expect(channels.pinterest.url).not.toContain("media=")
    })

    it("whatsapp — 使用 wa.me 链接分享文本", () => {
      const channels = buildShareLinks(input)
      expect(channels.whatsapp.type).toBe("web_share_url")
      expect(channels.whatsapp.url).toContain("wa.me/?text=")
    })

    it("telegram — 使用 t.me/share/url 分享", () => {
      const channels = buildShareLinks(input)
      expect(channels.telegram.type).toBe("web_share_url")
      expect(channels.telegram.url).toContain("t.me/share/url")
      expect(channels.telegram.url).toContain("url=")
      expect(channels.telegram.url).toContain("text=")
    })
  })

  describe("mailto 类型渠道", () => {
    it("email — 使用 mailto: 协议", () => {
      const channels = buildShareLinks(input)
      expect(channels.email.type).toBe("mailto")
      expect(channels.email.enabled).toBe(true)
      expect(channels.email.url).toMatch(/^mailto:\?subject=/)
      expect(channels.email.url).toContain(encodeURIComponent(input.title))
      expect(channels.email.url).toContain("body=")
      expect(channels.email.url).toContain(encodeURIComponent(input.productUrl))
    })
  })

  describe("copy 类型渠道", () => {
    it("copy_link — 返回原始 URL（不编码），供前端复制", () => {
      const channels = buildShareLinks(input)
      expect(channels.copy_link.type).toBe("copy")
      expect(channels.copy_link.enabled).toBe(true)
      expect(channels.copy_link.value).toBe(input.productUrl)
      // 确认没有编码，前端直接用它 clipboard.writeText
      expect(channels.copy_link.value).not.toContain("%3A%2F%2F")
    })
  })

  describe("copy_then_open 类型渠道", () => {
    it("instagram — 返回原始 URL + 提示文案", () => {
      const channels = buildShareLinks(input)
      expect(channels.instagram.type).toBe("copy_then_open")
      expect(channels.instagram.enabled).toBe(true)
      expect(channels.instagram.value).toBe(input.productUrl)
      expect(channels.instagram.message).toContain("Instagram")
      expect(channels.instagram.message).toContain("Copy link")
    })

    it("tiktok — 返回原始 URL + 提示文案", () => {
      const channels = buildShareLinks(input)
      expect(channels.tiktok.type).toBe("copy_then_open")
      expect(channels.tiktok.enabled).toBe(true)
      expect(channels.tiktok.value).toBe(input.productUrl)
      expect(channels.tiktok.message).toContain("TikTok")
      expect(channels.tiktok.message).toContain("Copy link")
    })

    it("wechat — 复制标题+链接供粘贴到微信", () => {
      const channels = buildShareLinks(input)
      expect(channels.wechat.type).toBe("copy_then_open")
      expect(channels.wechat.enabled).toBe(true)
      expect(channels.wechat.value).toBe(buildShareText(input.title, input.productUrl))
      expect(channels.wechat.message).toContain("WeChat")
    })
  })

  describe("URL 编码", () => {
    it("所有 URL 参数使用 encodeURIComponent 编码特殊字符", () => {
      const special = {
        productUrl: "https://example.com/products/prod abc&special=true",
        title: "Cool & Fresh T-Shirt #1",
        imageUrl: "https://example.com/img/t-shirt (1).png"
      }
      const channels = buildShareLinks(special)

      // Facebook URL 编码了空格
      expect(channels.facebook.url).not.toContain("prod abc")
      expect(channels.facebook.url).toContain("prod%20abc")
      // X text 编码了 & 和 #
      expect(channels.x.url).toContain("Cool%20%26%20Fresh%20T-Shirt%20%231")
    })
  })
})
