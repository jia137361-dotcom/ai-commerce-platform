import {
  PRIMARY_SHARE_CHANNELS,
  SHARE_CHANNEL_LABELS,
  buildShareChannels,
} from "./share-channels"

describe("primary share channels", () => {
  it("shows Twitter/X and Facebook instead of WeChat", () => {
    expect(PRIMARY_SHARE_CHANNELS).toEqual([
      "x",
      "facebook",
      "whatsapp",
      "tiktok",
      "copy_link",
    ])
    expect(PRIMARY_SHARE_CHANNELS).not.toContain("wechat")
    expect(SHARE_CHANNEL_LABELS.x).toBe("Twitter")
    expect(SHARE_CHANNEL_LABELS.facebook).toBe("Facebook")
  })

  it("builds openable share URLs for every primary channel", () => {
    const pageUrl = "http://127.0.0.1:5174/products/prod_test"
    const channels = buildShareChannels({
      pageUrl,
      title: "Sports Shorts (Long)",
      imageUrl: "http://127.0.0.1:5174/mock.png",
    })

    expect(channels.x.type).toBe("web_share_url")
    expect(channels.x.url).toContain("x.com/intent/post")
    expect(channels.x.url).toContain(encodeURIComponent(pageUrl))

    expect(channels.facebook.type).toBe("web_share_url")
    expect(channels.facebook.url).toContain("facebook.com/sharer/sharer.php?u=")
    expect(channels.facebook.url).toContain(encodeURIComponent(pageUrl))

    expect(channels.whatsapp.url).toContain("wa.me/?text=")
    expect(channels.tiktok.type).toBe("copy_then_open")
    expect(channels.copy_link.value).toBe(pageUrl)
  })
})
