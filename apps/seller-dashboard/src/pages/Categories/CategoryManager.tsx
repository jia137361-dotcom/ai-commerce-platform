import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, ApiError } from "../../lib/api-client"
import { useToast } from "../../components/ToastProvider"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { Input, Label } from "../../components/ui/Input"
import { Modal } from "../../components/ui/Modal"

type Category = {
  category_id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  sort_order: number
  level: number
  supplier_category_id: string | null
  product_count?: number
}

function buildTree(flat: Category[]): Category[] {
  const map = new Map<string, Category & { children: Category[] }>()
  const roots: (Category & { children: Category[] })[] = []

  for (const cat of flat) {
    map.set(cat.category_id, { ...cat, children: [] })
  }

  for (const cat of flat) {
    const node = map.get(cat.category_id)!
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

function TreeNode({
  node,
  depth,
  onEdit,
  onDelete,
  productCounts,
}: {
  node: Category & { children?: Category[] }
  depth: number
  onEdit: (cat: Category) => void
  onDelete: (cat: Category, count: number) => void
  productCounts: Map<string, number>
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = (node.children ?? []).length > 0
  const productCount = productCounts.get(node.category_id) ?? 0

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm hover:border-slate-200 hover:bg-slate-50"
        style={{ marginLeft: `${depth * 24}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-200"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "▼" : "▶"}
          </button>
        ) : (
          <span className="h-5 w-5" />
        )}
        <span className="flex-1 font-medium text-slate-800">{node.name}</span>
        {node.supplier_category_id && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
            S2B #{node.supplier_category_id}
          </span>
        )}
        {productCount > 0 && (
          <span className="rounded bg-brand-light px-1.5 py-0.5 text-xs text-brand">
            {productCount} product{productCount !== 1 ? "s" : ""}
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(node)}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => onDelete(node, productCount)}
        >
          Delete
        </Button>
      </div>
      {hasChildren && expanded && (
        <div>
          {(node.children ?? [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((child) => (
              <TreeNode
                key={child.category_id}
                node={child}
                depth={depth + 1}
                onEdit={onEdit}
                onDelete={onDelete}
                productCounts={productCounts}
              />
            ))}
        </div>
      )}
    </div>
  )
}

export function CategoryManagerPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState<Category | null>(null)
  const [createMode, setCreateMode] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newParentId, setNewParentId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["product-categories"],
    queryFn: () =>
      apiFetch<{ categories: Category[]; count: number }>("/admin/product-categories"),
  })

  const categories = data?.categories ?? []
  const tree = useMemo(() => buildTree(categories), [categories])

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const category of categories) {
      counts.set(category.category_id, category.product_count ?? 0)
    }
    return counts
  }, [categories])

  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ category_id: string }>("/admin/product-categories", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          parent_id: newParentId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] })
      toast.push("Category created", "success")
      setCreateMode(false)
      setNewName("")
      setNewDescription("")
      setNewParentId(null)
    },
    onError: (err: unknown) => {
      toast.push(err instanceof ApiError ? err.message : "Failed to create category", "error")
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/product-categories/${editing!.category_id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editing!.name,
          description: editing!.description,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] })
      toast.push("Category updated", "success")
      setEditing(null)
    },
    onError: (err: unknown) => {
      toast.push(err instanceof ApiError ? err.message : "Failed to update category", "error")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/product-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] })
      toast.push("Category deleted", "success")
      setPendingDelete(null)
    },
    onError: (err: unknown) => {
      toast.push(err instanceof ApiError ? err.message : "Failed to delete category", "error")
    },
  })

  const handleDelete = (cat: Category, productCount: number) => {
    if (productCount > 0) {
      toast.push(
        `Cannot delete "${cat.name}": ${productCount} product(s) still reference it.`,
        "error"
      )
      return
    }
    setPendingDelete(cat)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Category Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize products into hierarchical categories.
          </p>
        </div>
        <Button onClick={() => setCreateMode(true)}>+ New Category</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <Card className="divide-y">
          {tree.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-slate-500">No categories yet.</p>
              <Button className="mt-4" onClick={() => setCreateMode(true)}>
                Create your first category
              </Button>
            </div>
          ) : (
            tree
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((node) => (
                <TreeNode
                  key={node.category_id}
                  node={node}
                  depth={0}
                  onEdit={setEditing}
                  onDelete={handleDelete}
                  productCounts={productCounts}
                />
              ))
          )}
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        open={createMode}
        title="Create Category"
        onClose={() => setCreateMode(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateMode(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              className="mt-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. T-Shirts"
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              className="mt-1"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          <div>
            <Label>Parent Category</Label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newParentId ?? ""}
              onChange={(e) => setNewParentId(e.target.value || null)}
            >
              <option value="">None (root level)</option>
              {categories
                .filter((c) => !c.parent_id)
                .map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={Boolean(editing)}
        title="Edit Category"
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editing?.name.trim() || updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-1"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                className="mt-1"
                value={editing.description ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value || null })
                }
              />
            </div>
            <div className="text-xs text-slate-500">
              Level: {editing.level} · Slug: {editing.slug}
              {editing.supplier_category_id &&
                ` · S2B ID: ${editing.supplier_category_id}`}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        title="Delete category?"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteMutation.isPending || !pendingDelete}
              onClick={() => {
                if (!pendingDelete) return
                deleteMutation.mutate(pendingDelete.category_id)
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        <p>
          Delete category <strong>{pendingDelete?.name}</strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
