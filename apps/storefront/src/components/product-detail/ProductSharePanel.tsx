import type { BuyerShareInfo, DataSource } from "../../lib/buyer-api"
import { ShareChannelsPanel } from "../share/ShareChannelsPanel"

type ProductSharePanelProps = { share: BuyerShareInfo; source: DataSource; error?: string; compact?: boolean }

export function ProductSharePanel({ share, compact = false }: ProductSharePanelProps) {
  return (
    <ShareChannelsPanel
      className="buyer-product-share"
      compact={compact}
      heading="Share this product"
      title={share.title}
      pageUrl={share.productUrl}
      shareText={share.shareText}
      channels={share.channels}
    />
  )
}
