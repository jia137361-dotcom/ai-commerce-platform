import { getStripePublishableKey } from "../../lib/buyer-api"
import { isValidStripePublishableKey } from "../../pages/checkout/checkout-payment"

const TEST_CARDS = [
  { label: "Visa（成功）", number: "4242 4242 4242 4242" },
  { label: "Mastercard（成功）", number: "5555 5555 5555 4444" },
  { label: "Visa（拒付）", number: "4000 0000 0000 0002" },
  { label: "需 3DS 验证", number: "4000 0025 0000 3155" },
] as const

export function StripeTestModeHint() {
  const key = getStripePublishableKey()
  if (!isValidStripePublishableKey(key) || !key.startsWith("pk_test_")) return null

  return (
    <details className="buyer-stripe-test-hint">
      <summary>Test mode · 测试卡怎么填</summary>
      <p>
        在 <strong>Card</strong> 标签页填写下方测试卡。有效期填任意未来日期，CVC 填任意 3 位，邮编随意。
        Apple Pay / Google Pay 需浏览器与 Stripe 测试账户支持，本地可先只用 Card 测通。
      </p>
      <table>
        <thead>
          <tr>
            <th>场景</th>
            <th>卡号</th>
          </tr>
        </thead>
        <tbody>
          {TEST_CARDS.map((row) => (
            <tr key={row.number}>
              <td>{row.label}</td>
              <td>
                <code>{row.number}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
