type ShareModalProps = {
  onClose: () => void
}

const options = ["Facebook", "Instagram", "WhatsApp", "Pinterest", "Copy Link", "More"]

export function ShareModal({ onClose }: ShareModalProps) {
  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section className="modal share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>Close</button>
        <h2 id="share-title">Share to</h2>
        <div className="share-options">
          {options.map((option) => (
            <button type="button" key={option} onClick={onClose}>
              <span>{option.slice(0, 1)}</span>
              {option}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
