export function CheckoutPaymentPanel() {
  return (
    <section className="buyer-checkout-panel buyer-checkout-payment">
      <header>
        <span>3</span>
        <div>
          <h2>Payment method</h2>
          <p>Payment collection is not completed in this batch.</p>
        </div>
        <button type="button">Manage</button>
      </header>
      <div className="buyer-checkout-payment-empty">
        <div aria-hidden="true" />
        <strong>Save cards for a faster checkout</strong>
        <p>Secure payment · Convenient payment</p>
        <button type="button">Add a credit or debit card</button>
        <div className="buyer-checkout-card-logos">
          <span>VISA</span>
          <span>MC</span>
          <span>AMEX</span>
          <span>JCB</span>
          <span>DISC</span>
        </div>
      </div>
    </section>
  )
}
