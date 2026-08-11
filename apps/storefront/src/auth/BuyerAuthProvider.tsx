import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  getCurrentCustomer,
  registerCustomer,
  signInCustomer,
  signOutCustomer,
  updateCustomerProfile,
  type BuyerCustomer,
  type BuyerProfileUpdateInput,
  type BuyerRegisterInput,
  type BuyerSignInInput,
} from "../lib/buyer-api"
import { BuyerAuthContext } from "./useBuyerAuth"
import { clearBuyerAuthClientState } from "./buyer-auth-state"
import { writeBuyerDisplayPreferences } from "../lib/buyer-display-preferences"
import { readBuyerPreferencesFromMetadata } from "../lib/buyer-preferences"

export function BuyerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<BuyerCustomer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const refreshCustomer = async () => {
    setError(undefined)
    try {
      const current = await getCurrentCustomer()
      setCustomer(current)
      return current
    } catch (refreshError) {
      setCustomer(null)
      return null
    }
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      const current = await refreshCustomer()
      if (!active) return
      setCustomer(current)
      setIsLoading(false)
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!customer) return
    const preferences = readBuyerPreferencesFromMetadata(customer.metadata)
    writeBuyerDisplayPreferences(preferences)
  }, [customer])

  const value = useMemo(
    () => ({
      customer,
      isAuthenticated: Boolean(customer),
      isLoading,
      error,
      signIn: async (input: BuyerSignInInput) => {
        setError(undefined)
        try {
          const signedIn = await signInCustomer(input)
          setCustomer(signedIn)
          return signedIn
        } catch (signInError) {
          const message = signInError instanceof Error ? signInError.message : "Unable to sign in."
          setError(message)
          throw new Error(message)
        }
      },
      register: async (input: BuyerRegisterInput) => {
        setError(undefined)
        try {
          const registered = await registerCustomer(input)
          setCustomer(registered)
          return registered
        } catch (registerError) {
          const message = registerError instanceof Error ? registerError.message : "Unable to register."
          setError(message)
          throw new Error(message)
        }
      },
      signOut: async () => {
        setError(undefined)
        await signOutCustomer().catch(() => undefined)
        clearBuyerAuthClientState(window.localStorage, window.sessionStorage)
        setCustomer(null)
      },
      refreshCustomer,
      updateProfile: async (input: BuyerProfileUpdateInput) => {
        setError(undefined)
        const updated = await updateCustomerProfile(input)
        setCustomer(updated)
        return updated
      },
    }),
    [customer, error, isLoading]
  )

  return <BuyerAuthContext.Provider value={value}>{children}</BuyerAuthContext.Provider>
}
