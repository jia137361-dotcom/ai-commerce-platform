import { useEffect, useState } from "react"
import type { StoreProduct } from "../../lib/mock-data"
import { fetchStoreProduct } from "../../lib/store-api"
import { ErrorState, LoadingState } from "../ui/States"

type ProductDetailPageProps = {
  productId: string
  onAddToCart: (product: StoreProduct, quantity: number) => Promise<void>
}

const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL"]

export function ProductDetailPage({ productId, onAddToCart }: ProductDetailPageProps) {
  const [product, setProduct] = useState<StoreProduct | null>(null)
  const [source, setSource] = useState<"backend" | "mock">("mock")
  const [error, setError] = useState<string | undefined>()
  const [quantity, setQuantity] = useState(1)
  const [size, setSize] = useState("M")
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState<string | undefined>()

  useEffect(() => {
    let active = true
    setProduct(null)
    fetchStoreProduct(productId).then((result) => {
      if (!active) return
      setProduct(result.product)
      setSource(result.source)
      setError(result.error)
    })
    return () => {
      active = false
    }
  }, [productId])

  if (!product) return <LoadingState label="Loading product..." />

  const galleryImages = [product.mockupImageUrl, product.imageUrl, product.designImageUrl].filter(Boolean) as string[]
  const canAdd = Boolean(product.isCartAddable && product.medusaVariantId)

  const add = async () => {
    setAdding(true)
    setNotice(undefined)
    try {
      await onAddToCart(product, quantity)
      setNotice("Added to cart.")
    } catch (addError) {
      setNotice(addError instanceof Error ? addError.message : "Unable to add this item.")
    } finally {
      setAdding(false)
    }
  }

  return (
    <main className="detail-page product-detail-page">
      {error && <ErrorState title="Using fallback product data" message={error} />}
      <a className="back-link" href="/store">Back to store</a>
      <section className="product-detail-grid">
        <ProductDetailGallery images={galleryImages.length ? galleryImages : [product.imageUrl]} title={product.title} />
        <aside className="product-info-panel">
          <span className="eyebrow">{source === "backend" ? "Live Store Product" : "Mock Product"}</span>
          <h1>{product.title}</h1>
          <div className="product-rating-line">
            <strong>{product.averageRating ? product.averageRating.toFixed(1) : "New"}</strong>
            <span>{product.reviewCount ?? 0} reviews</span>
          </div>
          <p>{product.description ?? "A curated product ready for the Phase 1 storefront path."}</p>
          <strong className="detail-price">{product.price}</strong>

          <div className="variant-panel">
            <div>
              <span>Color</span>
              <div className="swatch-row">
                <button className="swatch active" type="button" aria-label="Yellow" />
                <button className="swatch dark" type="button" aria-label="Black" />
                <button className="swatch light" type="button" aria-label="White" />
              </div>
            </div>
            <div>
              <span>Size: {size}</span>
              <div className="size-grid">
                {sizeOptions.map((item) => (
                  <button className={size === item ? "active" : ""} key={item} type="button" onClick={() => setSize(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
          </div>

          <div className="product-actions">
            <button type="button" disabled={!canAdd || adding} onClick={add}>
              {adding ? "Adding..." : canAdd ? "Add to cart" : "Not cart-ready"}
            </button>
            <a className="secondary-button" href="/cart">View cart</a>
          </div>
          {notice && <div className="soft-notice">{notice}</div>}

          <dl className="product-meta-list">
            <div><dt>Native variant</dt><dd>{product.medusaVariantId ?? "Not linked"}</dd></div>
            <div><dt>Supplier variant</dt><dd>{product.supplierVariantId ?? "Pending"}</dd></div>
            <div><dt>Mockup</dt><dd>{product.mockupImageUrl ? "Available" : "Fallback image"}</dd></div>
            <div><dt>Print file</dt><dd>{product.printFileUrl ? "Available" : "Not returned"}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="product-tabs-panel">
        <div className="detail-tabs">
          <button className="active" type="button">Description</button>
          <button type="button">Parameters</button>
          <button type="button">Reviews</button>
          <button type="button">Recommend</button>
        </div>
        <p>{product.description ?? "Detailed product copy will be expanded after the P0 product path is stable."}</p>
      </section>
    </main>
  )
}

function ProductDetailGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(0)
  const current = images[selected] ?? images[0]

  return (
    <section className="product-gallery">
      <div className="gallery-main">
        <img src={current} alt={title} />
      </div>
      <div className="gallery-thumbs">
        {images.map((image, index) => (
          <button className={selected === index ? "active" : ""} type="button" key={`${image}-${index}`} onClick={() => setSelected(index)}>
            <img src={image} alt={`${title} ${index + 1}`} />
          </button>
        ))}
      </div>
    </section>
  )
}

function QuantitySelector({
  quantity,
  setQuantity,
}: {
  quantity: number
  setQuantity: (quantity: number) => void
}) {
  return (
    <div>
      <span>Quantity</span>
      <div className="quantity-control">
        <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
        <strong>{quantity}</strong>
        <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
      </div>
    </div>
  )
}
