import type { CompleteCartResponse } from "../../lib/buyer-api"
import type { StoreCart } from "../../lib/mock-data"

type CheckoutCompletionInput = {
  cart: StoreCart
  customerId: string
  bindCustomer: (cartId: string) => Promise<StoreCart>
  saveContact: (cart: StoreCart) => Promise<StoreCart>
  complete: (cartId: string) => Promise<CompleteCartResponse>
}

export async function completeGuestCheckoutOrder(input: {
  cart: StoreCart
  saveContact: (cart: StoreCart) => Promise<StoreCart>
  complete: (cartId: string) => Promise<CompleteCartResponse>
}) {
  const contactCart = await input.saveContact(input.cart)
  const result = await input.complete(contactCart.id)
  if (!result.orderId) throw new Error("Complete cart succeeded without an order_id.")
  return { contactCart, result }
}

export async function completeCheckoutOrder(input: CheckoutCompletionInput) {
  const boundCart = await input.bindCustomer(input.cart.id)
  if (boundCart.customerId !== input.customerId) {
    throw new Error("Cart customer binding did not return the current customer.")
  }
  const contactCart = await input.saveContact(boundCart)
  const result = await input.complete(contactCart.id)
  if (!result.orderId) throw new Error("Complete cart succeeded without an order_id.")
  return { boundCart, contactCart, result }
}
