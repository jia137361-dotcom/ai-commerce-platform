import { Module } from "@medusajs/framework/utils"
import CheckoutPaymentAttemptsModuleService from "./service"

export const CHECKOUT_PAYMENT_ATTEMPTS_MODULE = "checkout_payment_attempts"

export default Module(CHECKOUT_PAYMENT_ATTEMPTS_MODULE, {
  service: CheckoutPaymentAttemptsModuleService,
})
