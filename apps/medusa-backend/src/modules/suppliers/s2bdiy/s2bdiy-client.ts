import { getAccessToken } from "./s2bdiy-auth"

const baseUrl = () => process.env.S2BDIY_API_BASE_URL

export class S2bDiyError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown
  ) {
    super(message)
    this.name = "S2bDiyError"
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getAccessToken()
  const url = `${baseUrl()}${path}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }

  let fetchBody: BodyInit | undefined

  if (body instanceof FormData) {
    fetchBody = body
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    fetchBody = JSON.stringify(body)
  }

  const response = await fetch(url, { method, headers, body: fetchBody })

  if (!response.ok) {
    const text = await response.text()
    throw new S2bDiyError(`S2BDIY ${method} ${path} failed: ${response.status}`, response.status, text)
  }

  const json = await response.json()
  return json as T
}

export function s2bGet<T>(path: string): Promise<T> {
  return request<T>("GET", path)
}

export function s2bPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body)
}
