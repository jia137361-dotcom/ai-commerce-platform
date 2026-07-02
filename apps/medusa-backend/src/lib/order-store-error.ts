import { ErrorCodes } from "./errors"

export class OrderStoreAccessError extends Error {
  readonly code = ErrorCodes.ORDER_STORE_ACCESS_DENIED

  constructor(message = "Order does not belong to current store") {
    super(message)
    this.name = "OrderStoreAccessError"
  }
}
