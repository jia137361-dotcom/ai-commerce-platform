import StoreCoreModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const STORE_CORE_MODULE = "store_core"

export default Module(STORE_CORE_MODULE, {
  service: StoreCoreModuleService
})

