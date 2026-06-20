import { Button } from "../ui/Button"

type QuantityStepperProps = { quantity: number; disabled?: boolean; onChange: (quantity: number) => void }

export function QuantityStepper({ quantity, disabled, onChange }: QuantityStepperProps) {
  return (
    <div className="buyer-cart-stepper" aria-label="Quantity">
      <Button variant="ghost" ariaLabel="Decrease quantity" disabled={disabled || quantity <= 1} onClick={() => onChange(Math.max(1, quantity - 1))}>−</Button>
      <strong aria-live="polite">{quantity}</strong>
      <Button variant="ghost" ariaLabel="Increase quantity" disabled={disabled || quantity >= 99} onClick={() => onChange(Math.min(99, quantity + 1))}>+</Button>
    </div>
  )
}
