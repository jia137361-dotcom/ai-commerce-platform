import { ErrorState } from "../ui/States"

export function CheckoutCompleteError({ message }: { message: string }) {
  return <ErrorState className="buyer-checkout-complete-error" title="Unable to place order" message={message} />
}
