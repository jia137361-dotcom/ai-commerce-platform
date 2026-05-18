import { MedusaService } from "@medusajs/framework/utils"
import Store from "./models/store"
import StoreMember from "./models/store-member"
import DomainBinding from "./models/domain-binding"
import StoreSetting from "./models/store-setting"
import Product from "./models/product"
import ProductCategory from "./models/product-category"
import PlatformProduct from "./models/platform-product"
import Supplier from "./models/supplier"
import SupplierProduct from "./models/supplier-product"
import SupplierProductVariant from "./models/supplier-product-variant"
import SupplierPrintSpec from "./models/supplier-print-spec"
import PlatformDesignTemplate from "./models/platform-design-template"

class StoreCoreModuleService extends MedusaService({
  Store,
  StoreMember,
  DomainBinding,
  StoreSetting,
  Product,
  ProductCategory,
  PlatformProduct,
  Supplier,
  SupplierProduct,
  SupplierProductVariant,
  SupplierPrintSpec,
  PlatformDesignTemplate
}) {}

export default StoreCoreModuleService

