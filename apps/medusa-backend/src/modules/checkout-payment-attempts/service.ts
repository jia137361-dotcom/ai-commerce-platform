import { MedusaService } from "@medusajs/framework/utils"
import CheckoutPaymentAttempt from "./models/checkout-payment-attempt"

class CheckoutPaymentAttemptsModuleService extends MedusaService({
  CheckoutPaymentAttempt,
}) {}

export default CheckoutPaymentAttemptsModuleService
