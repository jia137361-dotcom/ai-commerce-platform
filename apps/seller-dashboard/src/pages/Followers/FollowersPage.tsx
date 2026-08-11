import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import { PageHeader } from "../../components/PageHeader"
import { Card } from "../../components/ui/Card"

type FollowerRow = {
  customer_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  display_name: string
}

export function FollowersPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["store-followers"],
    queryFn: () =>
      apiFetch<{ follower_count: number; followers: FollowerRow[] }>("/admin/store-followers"),
  })

  const followers = data?.followers ?? []
  const count = data?.follower_count ?? followers.length

  return (
    <div>
      <PageHeader
        title="Followers"
        description="Buyers who follow your storefront. Share exclusive coupon codes with them outside the app."
      />

      <Card className="mb-6">
        <p className="text-sm font-medium text-slate-500">Total followers</p>
        <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          {isLoading ? "…" : count}
        </p>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Follower list</h2>
          <Link to="/messages" className="text-xs font-medium text-brand hover:underline">
            Open inbox
          </Link>
        </div>

        {isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
        {isError ? (
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : "Unable to load followers"}
          </p>
        ) : null}

        {!isLoading && !isError && followers.length === 0 ? (
          <p className="text-sm text-slate-500">
            No followers yet. Buyers can follow from your storefront identity block.
          </p>
        ) : null}

        {followers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {followers.map((follower) => (
                  <tr key={follower.customer_id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 font-medium text-slate-900">{follower.display_name}</td>
                    <td className="py-3 pr-3 text-slate-600">{follower.email || "—"}</td>
                    <td className="py-3 pr-3">
                      <Link
                        to="/messages"
                        className="text-orange-600 hover:underline"
                        title="Reply in inbox (match by buyer thread)"
                      >
                        Message
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
