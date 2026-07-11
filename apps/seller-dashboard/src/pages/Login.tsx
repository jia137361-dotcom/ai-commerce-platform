import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { login } from "../lib/api-client"
import { useAuthStore } from "../lib/auth-store"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { FieldError, Input, Label } from "../components/ui/Input"

export function LoginPage() {
  const navigate = useNavigate()
  const setEmail = useAuthStore((s) => s.setEmail)
  const [email, setEmailLocal] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emailId = "login-email"
  const passwordId = "login-password"

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      setEmail(email)
      navigate("/products")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
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
          <p className="mt-2 text-sm text-slate-500">Seller Dashboard</p>
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
              onChange={(e) => setEmailLocal(e.target.value)}
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
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          New seller?{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  )
}
