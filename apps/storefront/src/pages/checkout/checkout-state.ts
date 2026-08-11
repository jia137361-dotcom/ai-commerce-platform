import { canCheckoutCart } from "../../lib/buyer-cart"
import type { StoreCart } from "../../lib/mock-data"

export type CheckoutStateInput = {
  cart: StoreCart | null
  authLoading: boolean
  authenticated: boolean
  emailVerified: boolean
  contactValid: boolean
  requiresShippingMethod: boolean
  addressValid: boolean
  addressSaved: boolean
  shippingMethodSaved: boolean
  paymentSessionReady: boolean
  placingOrder: boolean
}

export const resolveCheckoutState = (input: CheckoutStateInput) => {
  let disabledReason = ""
  if (!input.cart?.items.length) disabledReason = "Cart is empty."
  else if (!canCheckoutCart(input.cart)) disabledReason = "Resolve unavailable cart items or missing prices."
  else if (input.authLoading) disabledReason = "Checking account session."
  else if (input.authenticated && !input.emailVerified) disabledReason = "Verify your account email in Account & Security before placing the order."
  else if (!input.contactValid) disabledReason = "Enter a valid email, phone, and receiver name."
  else if (input.placingOrder) disabledReason = "Placing order..."
  else if (input.requiresShippingMethod && !input.addressValid) disabledReason = "Enter a complete delivery address."
  else if (input.requiresShippingMethod && !input.addressSaved) disabledReason = "Save delivery address before placing the order."
  else if (input.requiresShippingMethod && !input.shippingMethodSaved) disabledReason = "Confirm delivery address to calculate shipping."
  else if (!input.paymentSessionReady) disabledReason = "Initialize a valid payment session before placing the order."

  return { canPlaceOrder: !disabledReason, disabledReason }
}
