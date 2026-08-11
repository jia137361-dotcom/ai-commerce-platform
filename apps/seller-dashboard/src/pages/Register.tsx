import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { registerSeller } from "../lib/api-client"
import { useAuthStore } from "../lib/auth-store"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { FieldError, Input, Label } from "../components/ui/Input"

export function RegisterPage() {
  const navigate = useNavigate()
  const setEmail = useAuthStore((s) => s.setEmail)
  const [storeName, setStoreName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmailLocal] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const seller = await registerSeller({
        email,
        password,
        storeName,
        firstName,
        lastName,
      })
      setEmail(seller.email ?? email)
      navigate("/")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
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
          <p className="mt-2 text-sm text-slate-500">Create your seller account</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="register-store-name">Store name</Label>
            <Input
              id="register-store-name"
              className="mt-1"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="My Print Shop"
              autoComplete="organization"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="register-first-name">First name</Label>
              <Input
                id="register-first-name"
                className="mt-1"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div>
              <Label htmlFor="register-last-name">Last name</Label>
              <Input
                id="register-last-name"
                className="mt-1"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              className="mt-1"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmailLocal(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="register-password">Password</Label>
            <Input
              id="register-password"
              className="mt-1"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="mt-1 text-xs text-slate-500">At least 8 characters</p>
          </div>
          <FieldError message={error} />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Creating account…" : "Create seller account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have a seller account?{" "}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}
