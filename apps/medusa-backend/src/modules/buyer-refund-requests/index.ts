import { Module } from "@medusajs/framework/utils"
import BuyerRefundRequestsModuleService from "./service"

export const BUYER_REFUND_REQUESTS_MODULE = "buyer_refund_requests"

export default Module(BUYER_REFUND_REQUESTS_MODULE, {
  service: BuyerRefundRequestsModuleService,
})
