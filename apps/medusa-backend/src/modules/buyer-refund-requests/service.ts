import { MedusaService } from "@medusajs/framework/utils"
import BuyerRefundRequest from "./models/buyer-refund-request"

class BuyerRefundRequestsModuleService extends MedusaService({
  BuyerRefundRequest,
}) {}

export default BuyerRefundRequestsModuleService
