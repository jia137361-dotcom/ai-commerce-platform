import { useRef, useState } from "react"
import { submitProductReview, uploadReviewImage, type BuyerOrderSummary } from "../../lib/buyer-api"
import { prepareReviewImageUpload } from "../../lib/review-image-upload"
import { Button } from "../ui/Button"
import { Modal } from "../ui/Modal"
import { StarRatingInput } from "./StarRatingInput"

const REVIEW_MAX_IMAGES = 5

export type OrderReviewTarget = {
  productId: string
  productTitle: string
  orderNumber: string
  email: string
  customerName?: string
}

type OrderReviewDialogProps = {
  open: boolean
  order: Pick<BuyerOrderSummary, "displayId" | "orderId" | "previewItems">
  customerEmail?: string | null
  customerName?: string | null
  onClose: () => void
  onSubmitted?: () => void
}

const uploadSelectedReviewImages = async (files: File[]) => {
  const uploaded: string[] = []
  for (const file of files) {
    const prepared = await prepareReviewImageUpload(file)
    const response = await uploadReviewImage(prepared)
    uploaded.push(response.imageUrl)
  }
  return uploaded
}

export function OrderReviewDialog({
  open,
  order,
  customerEmail,
  customerName,
  onClose,
  onSubmitted,
}: OrderReviewDialogProps) {
  const previewItem = order.previewItems[0]
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [productRating, setProductRating] = useState(5)
  const [logisticsRating, setLogisticsRating] = useState(5)
  const [overallRating, setOverallRating] = useState(5)
  const [content, setContent] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<string>()

  if (!previewItem?.productId || !customerEmail) {
    return null
  }

  const resetForm = () => {
    setProductRating(5)
    setLogisticsRating(5)
    setOverallRating(5)
    setContent("")
    setImageUrls([])
    setFormMessage(undefined)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleImageSelect = async (files: FileList | null) => {
    if (!files?.length) return
    const remaining = REVIEW_MAX_IMAGES - imageUrls.length
    if (remaining <= 0) {
      setFormMessage(`You can upload up to ${REVIEW_MAX_IMAGES} images.`)
      return
    }

    setUploading(true)
    setFormMessage(undefined)
    try {
      const selected = Array.from(files).slice(0, remaining)
      const uploaded = await uploadSelectedReviewImages(selected)
      setImageUrls((current) => [...current, ...uploaded].slice(0, REVIEW_MAX_IMAGES))
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Unable to upload image. Try a smaller photo.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setFormMessage(undefined)
    try {
      await submitProductReview({
        productId: previewItem.productId!,
        email: customerEmail,
        orderNumber: order.displayId ?? order.orderId,
        rating: productRating,
        logisticsRating,
        overallRating,
        content: content.trim() || undefined,
        customerName: customerName ?? undefined,
        imageUrls,
      })
      onSubmitted?.()
      handleClose()
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Unable to publish review")
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      eyebrow={`Order #${order.displayId ?? order.orderId}`}
      title="Write a review"
      description={`Share your experience with ${previewItem.title}.`}
      onClose={handleClose}
      className="buyer-order-review-modal"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={submitting || uploading}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting || uploading}>
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
        </>
      }
    >
      <div className="buyer-order-review-form">
        <StarRatingInput label="Product rating" value={productRating} onChange={setProductRating} required />
        <StarRatingInput label="Shipping rating" value={logisticsRating} onChange={setLogisticsRating} required />
        <StarRatingInput label="Overall rating" value={overallRating} onChange={setOverallRating} required />

        <label className="buyer-order-review-text">
          Review text
          <textarea
            value={content}
            maxLength={2000}
            rows={4}
            placeholder="Optional — tell others about the product and delivery experience."
            onChange={(event) => setContent(event.target.value)}
          />
        </label>

        <div className="buyer-order-review-images">
          <div>
            <strong>Photos</strong>
            <p>Optional — up to {REVIEW_MAX_IMAGES} images.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            hidden
            onChange={(event) => void handleImageSelect(event.target.files)}
          />
          <Button
            variant="secondary"
            type="button"
            disabled={uploading || imageUrls.length >= REVIEW_MAX_IMAGES}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Add photos"}
          </Button>
          {imageUrls.length ? (
            <ul className="buyer-order-review-image-list">
              {imageUrls.map((url) => (
                <li key={url}>
                  <img src={url} alt="" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setImageUrls((current) => current.filter((entry) => entry !== url))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {formMessage ? <p role="alert" className="buyer-order-error">{formMessage}</p> : null}
      </div>
    </Modal>
  )
}

export function OrderReviewFormPanel({
  target,
  onSubmitted,
}: {
  target: OrderReviewTarget
  onSubmitted?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [productRating, setProductRating] = useState(5)
  const [logisticsRating, setLogisticsRating] = useState(5)
  const [overallRating, setOverallRating] = useState(5)
  const [content, setContent] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<string>()

  const handleImageSelect = async (files: FileList | null) => {
    if (!files?.length) return
    const remaining = REVIEW_MAX_IMAGES - imageUrls.length
    if (remaining <= 0) return

    setUploading(true)
    setFormMessage(undefined)
    try {
      const selected = Array.from(files).slice(0, remaining)
      const uploaded = await uploadSelectedReviewImages(selected)
      setImageUrls((current) => [...current, ...uploaded].slice(0, REVIEW_MAX_IMAGES))
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Unable to upload image. Try a smaller photo.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <form
      className="buyer-order-review-form buyer-product-review-form"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitting(true)
        setFormMessage(undefined)
        void submitProductReview({
          productId: target.productId,
          email: target.email,
          orderNumber: target.orderNumber,
          rating: productRating,
          logisticsRating,
          overallRating,
          content: content.trim() || undefined,
          customerName: target.customerName,
          imageUrls,
        })
          .then(() => {
            setFormMessage("Review published.")
            onSubmitted?.()
          })
          .catch((error) =>
            setFormMessage(error instanceof Error ? error.message : "Unable to publish review")
          )
          .finally(() => setSubmitting(false))
      }}
    >
      <h3>Review this delivered item</h3>
      <StarRatingInput label="Product rating" value={productRating} onChange={setProductRating} required />
      <StarRatingInput label="Shipping rating" value={logisticsRating} onChange={setLogisticsRating} required />
      <StarRatingInput label="Overall rating" value={overallRating} onChange={setOverallRating} required />
      <label className="buyer-order-review-text">
        Review text
        <textarea
          value={content}
          maxLength={2000}
          rows={4}
          placeholder="Optional"
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <div className="buyer-order-review-images">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          multiple
          hidden
          onChange={(event) => void handleImageSelect(event.target.files)}
        />
        <Button
          variant="secondary"
          type="button"
          disabled={uploading || imageUrls.length >= REVIEW_MAX_IMAGES}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Add photos (optional)"}
        </Button>
        {imageUrls.length ? (
          <ul className="buyer-order-review-image-list">
            {imageUrls.map((url) => (
              <li key={url}>
                <img src={url} alt="" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <button type="submit" disabled={submitting || uploading}>
        {submitting ? "Publishing…" : "Publish review"}
      </button>
      {formMessage ? <p role="status">{formMessage}</p> : null}
    </form>
  )
}
