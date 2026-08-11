import { useEffect, useState } from "react"
import {
  fetchBuyerPageSettings,
  marketplaceBuyerSettings,
  type BuyerStoreSettings,
} from "../lib/buyer-api"

type UseBuyerPageSettingsOptions = {
  marketplace?: boolean
  storeId?: string
}

export function useBuyerPageSettings(options?: UseBuyerPageSettingsOptions) {
  const marketplace = options?.marketplace ?? false
  const [settings, setSettings] = useState<BuyerStoreSettings>(marketplaceBuyerSettings)

  useEffect(() => {
    let active = true
    void fetchBuyerPageSettings(options).then((result) => {
      if (active) setSettings(result.data)
    })
    return () => {
      active = false
    }
  }, [marketplace, options?.storeId])

  // Indie storefront keeps a stable shell; marketplace chrome is opt-in only.
  const marketplaceMode = marketplace

  return { settings, marketplaceMode }
}
