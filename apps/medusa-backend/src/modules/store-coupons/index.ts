import { Module } from "@medusajs/framework/utils"
import StoreCouponsModuleService from "./service"

export const STORE_COUPONS_MODULE = "store_coupons"

export default Module(STORE_COUPONS_MODULE, {
  service: StoreCouponsModuleService,
})
