import { MedusaService } from "@medusajs/framework/utils"
import FulfillmentOrder from "./models/fulfillment-order"

class FulfillmentOrdersModuleService extends MedusaService({
  FulfillmentOrder,
}) {}

export default FulfillmentOrdersModuleService
