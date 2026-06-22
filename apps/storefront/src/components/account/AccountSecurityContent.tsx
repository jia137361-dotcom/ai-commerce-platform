import { FormEvent, useState } from "react"
import { changeBuyerPassword, type BuyerCustomer } from "../../lib/buyer-api"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

export function AccountSecurityContent({ customer }: { customer: BuyerCustomer }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) return setMessage("New passwords do not match.")
    setSaving(true)
    setMessage(undefined)
    try {
      await changeBuyerPassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage("Password changed successfully.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to change password")
    } finally {
      setSaving(false)
    }
  }

  return <Card as="section" className="buyer-account-setting-placeholder">
    <div className="buyer-account-setting-heading"><div><p className="buyer-account-kicker">Account setting</p><h1>Account &amp; Security</h1></div></div>
    <Card variant="outlined" className="buyer-account-setting-state"><h2>Sign-in identity</h2><p>{customer.email}</p></Card>
    <form onSubmit={(event) => void submit(event)} className="buyer-account-form">
      <label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
      <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
      <Button type="submit" disabled={saving}>{saving ? "Changing…" : "Change password"}</Button>
      {message ? <p role="status">{message}</p> : null}
    </form>
    <p className="buyer-account-setting-note">Email verification, MFA, session management, and account deletion still require dedicated security work.</p>
  </Card>
}
