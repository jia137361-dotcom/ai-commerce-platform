/**
 * Supplier Adapter Registry
 *
 * Adapters are registered at startup. The sync service and catalog API
 * look up adapters by supplier_id at runtime.
 */

import type { SupplierAdapter } from "./adapter"

const adapters = new Map<string, SupplierAdapter>()

export function registerSupplier(adapter: SupplierAdapter): void {
  adapters.set(adapter.supplierId, adapter)
}

export function getSupplierAdapter(supplierId: string): SupplierAdapter | undefined {
  return adapters.get(supplierId)
}

export function requireSupplierAdapter(supplierId: string): SupplierAdapter {
  const adapter = adapters.get(supplierId)
  if (!adapter) {
    throw new Error(`No adapter registered for supplier: ${supplierId}`)
  }
  return adapter
}

export function listRegisteredSuppliers(): SupplierAdapter[] {
  return Array.from(adapters.values())
}
