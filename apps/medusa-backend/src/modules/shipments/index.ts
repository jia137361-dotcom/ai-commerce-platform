import ShipmentsModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const SHIPMENTS_MODULE = "shipments"

export default Module(SHIPMENTS_MODULE, {
  service: ShipmentsModuleService,
})
