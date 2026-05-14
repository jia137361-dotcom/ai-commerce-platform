import { MedusaService } from "@medusajs/framework/utils"
import Store from "./models/store"
import StoreMember from "./models/store-member"
import DomainBinding from "./models/domain-binding"
import StoreSetting from "./models/store-setting"
import Product from "./models/product"
import ProductCategory from "./models/product-category"
import PlatformProduct from "./models/platform-product"

class StoreCoreModuleService extends MedusaService({
  Store,
  StoreMember,
  DomainBinding,
  StoreSetting,
  Product,
  ProductCategory,
  PlatformProduct
}) {}

export default StoreCoreModuleService

