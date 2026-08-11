import type { AccountSettingPlaceholder } from "../../pages/account/account-setting-placeholders"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { StatusBadge } from "../ui/StatusBadge"

export function AccountSettingPlaceholderContent({ setting }: { setting: AccountSettingPlaceholder }) {
  return (
    <Card as="section" className="buyer-account-setting-placeholder">
      <div className="buyer-account-setting-heading">
        <div><p className="buyer-account-kicker">Account setting</p><h1>{setting.title}</h1></div>
        <StatusBadge tone="warning">Coming later</StatusBadge>
      </div>
      <p>{setting.description}</p>
      <Card variant="muted" className="buyer-account-setting-state">
        <h2>Available in this demo</h2>
        <p>{setting.availableNow}</p>
      </Card>
      <Card variant="outlined" className="buyer-account-setting-state">
        <h2>Unavailable in demo</h2>
        <p>{setting.unavailable}</p>
      </Card>
      <p className="buyer-account-setting-note">This placeholder does not save preferences or call a new backend API.</p>
      <div className="buyer-account-actions">
        <Button href="/account">Back to account</Button>
        <Button href="/account/profile" variant="secondary">View profile</Button>
      </div>
    </Card>
  )
}
