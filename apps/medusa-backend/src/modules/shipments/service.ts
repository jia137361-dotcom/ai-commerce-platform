import { MedusaService } from "@medusajs/framework/utils"
import Shipment from "./models/shipment"

class ShipmentsModuleService extends MedusaService({
  Shipment,
}) {}

export default ShipmentsModuleService
