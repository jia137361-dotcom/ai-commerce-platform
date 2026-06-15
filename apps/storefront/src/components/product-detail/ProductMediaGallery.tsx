import { useState } from "react"

type ProductMediaGalleryProps = {
  images: string[]
  title: string
}

export function ProductMediaGallery({ images, title }: ProductMediaGalleryProps) {
  const [selected, setSelected] = useState(0)
  const visibleImages = images.length ? images : [""]
  const current = visibleImages[selected] ?? visibleImages[0]

  return (
    <section className="buyer-product-media" aria-label="Product media">
      <button className="buyer-product-media-arrow" type="button" onClick={() => setSelected((selected + visibleImages.length - 1) % visibleImages.length)}>
        <span aria-hidden="true">&lt;</span>
      </button>
      <div className="buyer-product-media-frame">
        {current ? <img src={current} alt={title} /> : <div className="buyer-product-media-empty">{title}</div>}
      </div>
      <button className="buyer-product-media-arrow" type="button" onClick={() => setSelected((selected + 1) % visibleImages.length)}>
        <span aria-hidden="true">&gt;</span>
      </button>
      <div className="buyer-product-media-dots" aria-label="Product image selector">
        {visibleImages.map((image, index) => (
          <button
            aria-label={`Show image ${index + 1}`}
            className={selected === index ? "active" : ""}
            key={`${image}-${index}`}
            type="button"
            onClick={() => setSelected(index)}
          />
        ))}
      </div>
    </section>
  )
}
