import FulfillmentOrdersModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const FULFILLMENT_ORDERS_MODULE = "fulfillment_orders"

export default Module(FULFILLMENT_ORDERS_MODULE, {
  service: FulfillmentOrdersModuleService,
})
