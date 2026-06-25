import { useEffect, useState } from "react"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

type StoreGalleryCarouselProps = {
  images: string[]
  title: string
}

export function StoreGalleryCarousel({ images, title }: StoreGalleryCarouselProps) {
  const [selected, setSelected] = useState(0)
  const [failed, setFailed] = useState<Record<number, boolean>>({})
  const usableImages = images.filter((_, index) => !failed[index])
  const current = usableImages[selected] ?? usableImages[0]

  useEffect(() => {
    setSelected(0)
    setFailed({})
  }, [images])

  useEffect(() => {
    if (selected >= usableImages.length) {
      setSelected(Math.max(usableImages.length - 1, 0))
    }
  }, [selected, usableImages.length])

  if (!usableImages.length) {
    return <p className="buyer-shop-field-unavailable">Store gallery has not been provided by the seller.</p>
  }

  const showControls = usableImages.length > 1
  const currentIndex = images.indexOf(current)
  const markFailed = (index: number) => {
    setFailed((currentFailed) => ({ ...currentFailed, [index]: true }))
  }

  return (
    <div className="buyer-shop-gallery-carousel" aria-label="Store gallery">
      <Card className="buyer-shop-gallery-frame">
        {current ? (
          <>
            <img
              src={current}
              alt={`${title} gallery ${selected + 1}`}
              loading="lazy"
              onError={() => {
                if (currentIndex >= 0) {
                  markFailed(currentIndex)
                }
              }}
            />
            {showControls ? (
              <span className="buyer-shop-gallery-counter" aria-live="polite">
                {selected + 1} / {usableImages.length}
              </span>
            ) : null}
          </>
        ) : null}
      </Card>

      {showControls ? (
        <div className="buyer-shop-gallery-controls">
          <Button
            className="buyer-shop-gallery-nav"
            variant="secondary"
            ariaLabel="Previous gallery image"
            onClick={() => setSelected((value) => (value + usableImages.length - 1) % usableImages.length)}
          >
            ‹
          </Button>
          <div className="buyer-shop-gallery-thumbnails" aria-label="Gallery image selector">
            {usableImages.map((image, index) => (
              <button
                className={selected === index ? "active" : ""}
                key={`${image}-${index}`}
                type="button"
                aria-label={`Show gallery image ${index + 1}`}
                onClick={() => setSelected(index)}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
          <Button
            className="buyer-shop-gallery-nav"
            variant="secondary"
            ariaLabel="Next gallery image"
            onClick={() => setSelected((value) => (value + 1) % usableImages.length)}
          >
            ›
          </Button>
        </div>
      ) : null}
    </div>
  )
}
