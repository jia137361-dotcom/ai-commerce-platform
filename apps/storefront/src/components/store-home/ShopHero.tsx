type ShopHeroProps = { brandName: string; imageUrl?: string; isFallback?: boolean; announcement?: string; description?: string }

export function ShopHero({ brandName, imageUrl, isFallback = false, announcement, description }: ShopHeroProps) {
  const backgroundImage = imageUrl
    ? `linear-gradient(90deg, rgba(20, 14, 10, .78), rgba(20, 14, 10, .08)), url("${imageUrl.replace(/["\\]/g, "")}")`
    : undefined
  return (
    <section className={["buyer-store-hero", imageUrl ? "has-image" : ""].filter(Boolean).join(" ")} aria-label={`${brandName} promotion`} style={{ backgroundImage }}>
      <div className="buyer-store-hero-copy">
        {isFallback ? <span className="buyer-store-hero-fallback">Banner fallback</span> : null}
        <p>{announcement ?? "Store collection"}</p>
        <h2>{brandName}</h2>
        <span>{description ?? `Explore a considered collection from ${brandName}.`}</span>
        <a className="buyer-ui-button buyer-ui-button--primary" href="/store#products">Explore collection</a>
      </div>
    </section>
  )
}
