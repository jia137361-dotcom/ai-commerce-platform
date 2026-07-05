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
import ProductAsset from "./models/product-asset"
import ProductReview from "./models/product-review"
import SupplierOrder from "./models/supplier-order"
import SupplierOrderItem from "./models/supplier-order-item"
import AiGenerationJob from "./models/ai-generation-job"
import StoreNotification from "./models/store-notification"
import StoreMessage from "./models/store-message"
import PlatformOperator from "./models/platform-operator"
import PlatformAuditEvent from "./models/platform-audit-event"

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
  PlatformDesignTemplate,
  ProductAsset,
  ProductReview,
  SupplierOrder,
  SupplierOrderItem,
  AiGenerationJob,
  StoreNotification,
  StoreMessage,
  PlatformOperator,
  PlatformAuditEvent,
}) {}

export default StoreCoreModuleService
