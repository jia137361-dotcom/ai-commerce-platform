import StoreCoreModuleService from "./service"
import { Module } from "@medusajs/framework/utils"
import { registerSupplier } from "../suppliers/registry"
import { s2bdiyAdapter } from "../suppliers/s2bdiy/s2bdiy-adapter"

// Register supplier adapters at module load time
registerSupplier(s2bdiyAdapter)

export const STORE_CORE_MODULE = "store_core"

export default Module(STORE_CORE_MODULE, {
  service: StoreCoreModuleService
})

