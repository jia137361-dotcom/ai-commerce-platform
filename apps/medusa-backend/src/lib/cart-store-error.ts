import { ErrorCodes } from "./errors"

/** Thrown when a variant’s store does not match the cart’s store (metadata.store_id). */
export class CartStoreMismatchError extends Error {
  readonly code = ErrorCodes.CART_STORE_MISMATCH

  constructor(message = "Product does not belong to current store") {
    super(message)
    this.name = "CartStoreMismatchError"
  }
}

/** Thrown when cart.metadata.store_id !== resolveCurrentStore(req).store_id */
export class CartStoreAccessError extends Error {
  readonly code = ErrorCodes.CART_STORE_ACCESS_DENIED

  constructor(message = "Cart does not belong to current store") {
    super(message)
    this.name = "CartStoreAccessError"
  }
}
