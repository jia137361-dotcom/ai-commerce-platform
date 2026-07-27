import { MedusaService } from "@medusajs/framework/utils"
import StoreCoupon from "./models/store-coupon"
import BuyerCoupon from "./models/buyer-coupon"

class StoreCouponsModuleService extends MedusaService({
  StoreCoupon,
  BuyerCoupon,
}) {}

export default StoreCouponsModuleService
