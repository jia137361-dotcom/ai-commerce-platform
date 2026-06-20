import { useEffect, useState } from "react"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

type ProductMediaGalleryProps = { images: string[]; title: string }

export function ProductMediaGallery({ images, title }: ProductMediaGalleryProps) {
  const [selected, setSelected] = useState(0)
  const visibleImages = Array.from(new Set(images.filter(Boolean)))
  const current = visibleImages[selected] ?? visibleImages[0]

  useEffect(() => { setSelected(0) }, [images])

  return (
    <section className="buyer-product-media" aria-label="Product media">
      <Card className="buyer-product-media-frame">
        {current ? <img src={current} alt={title} /> : <div className="buyer-product-media-empty"><span aria-hidden="true">□</span><strong>No product image</strong></div>}
      </Card>
      {visibleImages.length > 1 ? (
        <div className="buyer-product-media-controls">
          <Button variant="ghost" ariaLabel="Previous image" onClick={() => setSelected((selected + visibleImages.length - 1) % visibleImages.length)}>‹</Button>
          <div className="buyer-product-media-thumbnails" aria-label="Product image selector">
            {visibleImages.map((image, index) => (
              <button className={selected === index ? "active" : ""} key={`${image}-${index}`} type="button" aria-label={`Show image ${index + 1}`} onClick={() => setSelected(index)}>
                <img src={image} alt="" />
              </button>
            ))}
          </div>
          <Button variant="ghost" ariaLabel="Next image" onClick={() => setSelected((selected + 1) % visibleImages.length)}>›</Button>
        </div>
      ) : null}
    </section>
  )
}
