type FeatureMenuPanelProps = {
  onClose?: () => void
}

/** Create / design tools — My Designs is the design bag; Cart stays separate for checkout. */
export function FeatureMenuPanel({ onClose }: FeatureMenuPanelProps) {
  return (
    <div className="buyer-account-panel buyer-account-panel--features" role="menu">
      <a href="/ai-design" onClick={onClose}>
        AI design
      </a>
      <a href="/my-designs" onClick={onClose}>
        My Designs
      </a>
      <a href="/account/orders" onClick={onClose}>
        Orders
      </a>
    </div>
  )
}
