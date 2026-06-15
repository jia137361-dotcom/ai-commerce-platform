import { apiFetch } from "./client"

export const loginAdmin = async (email: string, password: string) => {
  return apiFetch<{ token?: string; access_token?: string }>("/auth/user/emailpass", {
    method: "POST",
    body: { email, password },
  })
}

export const getAdminMe = async (token: string) => {
  return apiFetch<{ user?: Record<string, unknown> }>("/admin/users/me", {
    adminToken: token,
  })
}
