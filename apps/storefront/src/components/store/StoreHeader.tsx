type StoreHeaderProps = {
  activeTab: string
  onTabChange: (tab: string) => void
  onShare: () => void
}

const tabs = ["All Items", "Category", "Exotic Collection", "Ready-to-Wear", "Footwear", "Reviews(4.6★)", "About"]

export function StoreHeader({ activeTab, onTabChange, onShare }: StoreHeaderProps) {
  return (
    <section className="store-header">
      <div className="store-profile">
        <div className="store-logo">CG</div>
        <div>
          <h2>Citigoo Official Store</h2>
          <p>1.2M Followers | 98% Positive Feedback</p>
        </div>
      </div>
      <div className="store-actions">
        <button type="button">Follow</button>
        <button className="secondary-button" type="button">Message</button>
        <button className="secondary-button" type="button" onClick={onShare}>Share</button>
      </div>
      <div className="store-tabs" role="tablist">
        {tabs.map((tab) => {
          const key = tab.startsWith("Reviews") ? "reviews" : tab.toLowerCase().split("(")[0].replace(/\s+/g, "-")
          const active = activeTab === key
          return (
            <button className={active ? "active" : ""} type="button" key={tab} onClick={() => onTabChange(key)}>
              {tab}
            </button>
          )
        })}
      </div>
    </section>
  )
}
