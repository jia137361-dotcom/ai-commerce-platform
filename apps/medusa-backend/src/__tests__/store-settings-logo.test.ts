import {
  LOGO_MAX_BYTES,
  buildLogoPublicUrl,
  validateLogoUpload,
} from "../lib/store-settings-logo"

describe("validateLogoUpload", () => {
  it("rejects empty base64", () => {
    expect(validateLogoUpload("", "image/png")).toEqual({
      ok: false,
      message: "file_base64 is required",
    })
  })

  it("rejects invalid content type", () => {
    const b64 = Buffer.from("hello").toString("base64")
    expect(validateLogoUpload(b64, "image/gif")).toEqual({
      ok: false,
      message: "content_type must be image/png or image/jpeg",
    })
  })

  it("rejects payload larger than 2MB", () => {
    const large = Buffer.alloc(LOGO_MAX_BYTES + 1, 1).toString("base64")
    expect(validateLogoUpload(large, "image/png")).toEqual({
      ok: false,
      message: "Logo must be between 1 byte and 2MB",
    })
  })

  it("accepts valid png payload", () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    const result = validateLogoUpload(buffer.toString("base64"), "image/png")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.buffer.length).toBe(4)
    }
  })
})

describe("buildLogoPublicUrl", () => {
  it("builds static logos url", () => {
    expect(buildLogoPublicUrl("default_store-abc.png", "http://localhost:9000")).toBe(
      "http://localhost:9000/static/logos/default_store-abc.png"
    )
  })
})
