import { useEffect, useState } from "react"
import {
  fetchBuyerPageSettings,
  marketplaceBuyerSettings,
  type BuyerStoreSettings,
} from "../lib/buyer-api"
import { isMarketplaceStoreId } from "../lib/buyer-store-context"

type UseBuyerPageSettingsOptions = {
  marketplace?: boolean
  storeId?: string
}

export function useBuyerPageSettings(options?: UseBuyerPageSettingsOptions) {
  const marketplace = options?.marketplace ?? false
  const [settings, setSettings] = useState<BuyerStoreSettings>(
    marketplace ? marketplaceBuyerSettings : marketplaceBuyerSettings
  )

  useEffect(() => {
    let active = true
    void fetchBuyerPageSettings(options).then((result) => {
      if (active) setSettings(result.data)
    })
    return () => {
      active = false
    }
  }, [marketplace, options?.storeId])

  const marketplaceMode = marketplace || isMarketplaceStoreId(settings.storeId)

  return { settings, marketplaceMode }
}
