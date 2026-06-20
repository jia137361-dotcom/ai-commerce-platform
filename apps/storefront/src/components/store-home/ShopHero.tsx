type ShopHeroProps = { brandName: string; imageUrl?: string; isFallback?: boolean }

export function ShopHero({ brandName, imageUrl, isFallback = false }: ShopHeroProps) {
  const backgroundImage = imageUrl
    ? `linear-gradient(90deg, rgba(20, 14, 10, .78), rgba(20, 14, 10, .08)), url("${imageUrl.replace(/["\\]/g, "")}")`
    : undefined
  return (
    <section className={["buyer-store-hero", imageUrl ? "has-image" : ""].filter(Boolean).join(" ")} aria-label={`${brandName} promotion`} style={{ backgroundImage }}>
      <div className="buyer-store-hero-copy">
        {isFallback ? <span className="buyer-store-hero-fallback">Banner fallback</span> : null}
        <p>New season</p>
        <h2>The art of modern essentials</h2>
        <span>Explore a considered collection from {brandName}.</span>
        <a className="buyer-ui-button buyer-ui-button--primary" href="#products">Explore collection</a>
      </div>
    </section>
  )
}
