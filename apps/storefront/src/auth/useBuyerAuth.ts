import { createContext, useContext } from "react"
import type {
  BuyerCustomer,
  BuyerProfileUpdateInput,
  BuyerRegisterInput,
  BuyerSignInInput,
} from "../lib/buyer-api"

export type BuyerAuthContextValue = {
  customer: BuyerCustomer | null
  isAuthenticated: boolean
  isLoading: boolean
  error?: string
  signIn: (input: BuyerSignInInput) => Promise<BuyerCustomer>
  register: (input: BuyerRegisterInput) => Promise<BuyerCustomer | null>
  signOut: () => Promise<void>
  refreshCustomer: () => Promise<BuyerCustomer | null>
  updateProfile: (input: BuyerProfileUpdateInput) => Promise<BuyerCustomer>
}

export const BuyerAuthContext = createContext<BuyerAuthContextValue | null>(null)

export const useBuyerAuth = () => {
  const context = useContext(BuyerAuthContext)
  if (!context) {
    throw new Error("useBuyerAuth must be used within BuyerAuthProvider")
  }
  return context
}
