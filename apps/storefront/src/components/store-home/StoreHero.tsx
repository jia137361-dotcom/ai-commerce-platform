type StoreHeroProps = {
  brandName: string
}

export function StoreHero({ brandName }: StoreHeroProps) {
  return (
    <section className="buyer-store-hero" aria-label={`${brandName} promotion`}>
      <div className="buyer-store-hero-copy">
        <div className="buyer-store-hero-lockup">
          <strong>NESPRESSO</strong>
          <i />
          <span>
            SAMRA ORIGINS
            <small>BY THE WEEKND</small>
          </span>
        </div>
        <p>EXPERIENCE A TASTE THAT MOVES YOU</p>
      </div>
      <div className="buyer-store-hero-person" aria-hidden="true" />
      <div className="buyer-store-hero-products" aria-hidden="true" />
    </section>
  )
}
