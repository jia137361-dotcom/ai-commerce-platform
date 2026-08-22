import { adminCorsMiddleware } from "../lib/http/admin-cors"

describe("admin CORS middleware", () => {
  const makeResponse = () => {
    const headers = new Map<string, string>()
    return {
      headers,
      setHeader: (name: string, value: string) => headers.set(name, value),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
    } as any
  }

  it("answers an allowed admin preflight before authentication", () => {
    const response = makeResponse()
    const next = jest.fn()

    adminCorsMiddleware(
      {
        method: "OPTIONS",
        headers: {
          origin: "http://127.0.0.1:5173",
          "access-control-request-headers": "content-type,x-store-id",
        },
      } as any,
      response,
      next
    )

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://127.0.0.1:5173")
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true")
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("content-type,x-store-id")
    expect(response.status).toHaveBeenCalledWith(204)
    expect(response.end).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("does not allow an unknown origin", () => {
    const response = makeResponse()
    const next = jest.fn()

    adminCorsMiddleware(
      { method: "GET", headers: { origin: "https://malicious.example" } } as any,
      response,
      next
    )

    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false)
    expect(next).toHaveBeenCalled()
  })
})
