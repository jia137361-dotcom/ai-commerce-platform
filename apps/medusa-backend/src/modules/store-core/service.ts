import { MedusaService } from "@medusajs/framework/utils"
import Store from "./models/store"
import StoreMember from "./models/store-member"
import DomainBinding from "./models/domain-binding"
import StoreSetting from "./models/store-setting"
import Product from "./models/product"
import ProductCategory from "./models/product-category"

class StoreCoreModuleService extends MedusaService({
  Store,
  StoreMember,
  DomainBinding,
  StoreSetting,
  Product,
  ProductCategory
}) {}

export default StoreCoreModuleService

