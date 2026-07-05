import { create } from "zustand"
import { setToken } from "./api-client"
import { clearSellerStoreId } from "./seller-store-id"

type AuthState = {
  email: string | null
  setEmail: (email: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  email: localStorage.getItem("seller_email"),
  setEmail: (email) => {
    if (email) {
      localStorage.setItem("seller_email", email)
    } else {
      localStorage.removeItem("seller_email")
    }
    set({ email })
  },
  logout: () => {
    setToken(null)
    clearSellerStoreId()
    localStorage.removeItem("seller_email")
    set({ email: null })
  },
}))
