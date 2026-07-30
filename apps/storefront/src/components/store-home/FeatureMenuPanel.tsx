type FeatureMenuPanelProps = {
  onClose?: () => void
}

export function FeatureMenuPanel({ onClose }: FeatureMenuPanelProps) {
  return (
    <div className="buyer-account-panel buyer-account-panel--features" role="menu">
      <a href="/ai-design" onClick={onClose}>AI design</a>
      <a href="/saved" onClick={onClose}>My Saved</a>
      <a href="/account/orders" onClick={onClose}>Orders</a>
      <a href="/plans" onClick={onClose}>Plans</a>
      <a href="/help" onClick={onClose}>Support center</a>
    </div>
  )
}
