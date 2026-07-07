import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { PageHeader } from "../components/PageHeader"
import {
  addPlatformOperator,
  listPlatformOperators,
  updatePlatformOperator,
  type PlatformOperatorRow,
} from "../lib/api-client"
import {
  Button,
  Card,
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  FieldError,
  Input,
  Label,
  StatusBadge,
  TableSkeleton,
} from "../components/ui"

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—"
}

function OperatorActions({ operator }: { operator: PlatformOperatorRow }) {
  const queryClient = useQueryClient()
  const update = useMutation({
    mutationFn: (input: Partial<Pick<PlatformOperatorRow, "role" | "status">>) =>
      updatePlatformOperator(operator.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-operators"] }),
  })
  const disabled = operator.status === "disabled"
  const nextRole = operator.role === "admin" ? "viewer" : "admin"

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={update.isPending}
        onClick={() => update.mutate({ role: nextRole })}
      >
        Make {nextRole}
      </Button>
      <Button
        variant={disabled ? "primary" : "danger"}
        size="sm"
        disabled={update.isPending}
        onClick={() => update.mutate({ status: disabled ? "active" : "disabled" })}
      >
        {disabled ? "Reactivate" : "Deactivate"}
      </Button>
    </div>
  )
}

export function OperatorsPage() {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "viewer">("viewer")
  const [message, setMessage] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-operators"],
    queryFn: listPlatformOperators,
  })

  const addOperator = useMutation({
    mutationFn: addPlatformOperator,
    onSuccess: () => {
      setEmail("")
      setRole("viewer")
      setMessage("Operator access updated.")
      queryClient.invalidateQueries({ queryKey: ["platform-operators"] })
    },
    onError: (err: Error) => setMessage(err.message),
  })

  const operators = data?.operators ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operators"
        description="Manage platform-ops accounts. Seller store accounts are intentionally rejected."
      />

      <Card>
        <form
          className="grid gap-4 lg:grid-cols-[1fr_180px_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            setMessage(null)
            addOperator.mutate({ email, role })
          }}
        >
          <div>
            <Label htmlFor="operator-email">Medusa user email</Label>
            <Input
              id="operator-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operator@example.com"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              The Medusa user must already exist and must not be linked to a seller store.
            </p>
          </div>
          <div>
            <Label htmlFor="operator-role">Role</Label>
            <select
              id="operator-role"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              value={role}
              onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "viewer")}
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={addOperator.isPending || !email.trim()}>
              Add operator
            </Button>
          </div>
        </form>
        <FieldError message={message && addOperator.isError ? message : null} />
        {message && !addOperator.isError ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      </Card>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <EmptyState title="Unable to load operators" description={(error as Error).message} />
      ) : operators.length === 0 ? (
        <EmptyState title="No platform operators" description="Bootstrap a root operator before opening staging." />
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Email</DataTableHeaderCell>
              <DataTableHeaderCell>Role</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Seller link</DataTableHeaderCell>
              <DataTableHeaderCell>Created</DataTableHeaderCell>
              <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <tbody>
            {operators.map((operator) => (
              <DataTableRow key={operator.id}>
                <DataTableCell>
                  <div className="font-medium text-slate-900">{operator.email ?? operator.user_id}</div>
                  {operator.name ? <div className="text-xs text-slate-500">{operator.name}</div> : null}
                </DataTableCell>
                <DataTableCell className="capitalize">{operator.role}</DataTableCell>
                <DataTableCell>
                  <StatusBadge status={operator.status} />
                </DataTableCell>
                <DataTableCell>
                  {operator.has_store_membership ? (
                    <span className="text-sm font-medium text-red-600">Blocked account overlap</span>
                  ) : (
                    <span className="text-slate-500">Separate</span>
                  )}
                </DataTableCell>
                <DataTableCell className="text-slate-500">{formatDate(operator.created_at)}</DataTableCell>
                <DataTableCell>
                  <OperatorActions operator={operator} />
                </DataTableCell>
              </DataTableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}
