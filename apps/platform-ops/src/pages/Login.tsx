import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { login } from "../lib/api-client"
import { Button, Card, FieldError, Input, Label } from "../components/ui"

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emailId = "ops-login-email"
  const passwordId = "ops-login-password"

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      navigate("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登录失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-light via-white to-surface-muted px-4">
      <Card className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-brand">Cii</span>
            <span className="text-slate-900">Verse</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">Platform Ops · 平台运营</p>
          <p className="mt-1 text-xs text-slate-400">需 platform_operator 权限的管理员账号</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              className="mt-1"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor={passwordId}>Password</Label>
            <Input
              id={passwordId}
              className="mt-1"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <FieldError message={error} />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "登录中…" : "登录运营台"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
