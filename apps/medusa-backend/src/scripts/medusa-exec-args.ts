/**
 * Medusa 2.17+ removed `ExecArgs` from @medusajs/framework/types.
 * Use this module for all `medusa exec` scripts.
 */
import type { MedusaContainer } from "@medusajs/framework/types"

export type { MedusaContainer }

export type MedusaExecArgs = {
  container: MedusaContainer
}

/** @deprecated Prefer MedusaExecArgs — kept for existing script signatures. */
export type ExecArgs = MedusaExecArgs
