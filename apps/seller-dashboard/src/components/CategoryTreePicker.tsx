import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, ApiError } from "../lib/api-client"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"

type CategoryNode = {
  category_id: string
  name: string
  parent_id: string | null
  level: number
  sort_order: number
}

type Props = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

function buildTree(flat: CategoryNode[]): CategoryNode[] {
  const map = new Map<string, CategoryNode & { children: CategoryNode[] }>()
  const roots: (CategoryNode & { children: CategoryNode[] })[] = []

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
  selectedIds,
  onToggle,
  expanded,
  onExpand,
  onDelete,
  searchQuery,
  disabled,
}: {
  node: CategoryNode & { children?: CategoryNode[] }
  selectedIds: string[]
  onToggle: (id: string) => void
  expanded: Set<string>
  onExpand: (id: string) => void
  onDelete: (id: string, name: string) => void
  searchQuery: string
  disabled?: boolean
}) {
  const hasChildren = (node.children ?? []).length > 0
  const isExpanded = expanded.has(node.category_id)
  const isChecked = selectedIds.includes(node.category_id)

  const matchesSearch =
    !searchQuery ||
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.children ?? []).some((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  if (!matchesSearch) return null

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 ${
          isChecked ? "bg-brand-light/30" : ""
        }`}
        style={{ paddingLeft: `${(node.level - 1) * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-200"
            onClick={() => onExpand(node.category_id)}
            disabled={disabled}
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        ) : (
          <span className="h-5 w-5" />
        )}
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={isChecked}
          disabled={disabled}
          onChange={() => onToggle(node.category_id)}
        />
        <span className="flex-1 truncate text-slate-700">{node.name}</span>
        <span className="text-xs text-slate-400">
          L{node.level}
        </span>
        {!disabled && (
          <button
            type="button"
            className="h-5 w-5 flex items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Delete category"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(node.category_id, node.name)
            }}
          >
            ×
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {(node.children ?? [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((child) => (
              <TreeNode
                key={child.category_id}
                node={child}
                selectedIds={selectedIds}
                onToggle={onToggle}
                expanded={expanded}
                onExpand={onExpand}
                onDelete={onDelete}
                searchQuery={searchQuery}
                disabled={disabled}
              />
            ))}
        </div>
      )}
    </div>
  )
}

export function CategoryTreePicker({ selectedIds, onChange, disabled }: Props) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [newName, setNewName] = useState("")
  const [newParentId, setNewParentId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data } = useQuery({
    queryKey: ["product-categories"],
    queryFn: () =>
      apiFetch<{ categories: CategoryNode[] }>("/admin/product-categories"),
  })

  const categories = data?.categories ?? []
  const tree = useMemo(() => buildTree(categories), [categories])

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelect = (id: string) => {
    if (disabled) return
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    )
  }

  const removeSelected = (id: string) => {
    onChange(selectedIds.filter((i) => i !== id))
  }

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ category_id: string }>("/admin/product-categories", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), parent_id: newParentId }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] })
      onChange([...selectedIds, res.category_id])
      setNewName("")
      setNewParentId(null)
      setShowCreate(false)
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to create category"
      alert(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/product-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to delete category"
      alert(msg)
    },
  })

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return
    deleteMutation.mutate(id)
  }

  const expandAll = () => {
    const allIds = categories.map((c) => c.category_id)
    setExpanded(new Set(allIds))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={expandAll}
          disabled={disabled}
        >
          Expand All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          disabled={disabled}
        >
          + New
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <Input
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <select
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              value={newParentId ?? ""}
              onChange={(e) => setNewParentId(e.target.value || null)}
            >
              <option value="">No parent (root)</option>
              {categories
                .filter((c) => !c.parent_id)
                .map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const cat = categories.find((c) => c.category_id === id)
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-medium text-brand"
              >
                {cat?.name ?? id}
                {!disabled && (
                  <button
                    type="button"
                    className="ml-0.5 hover:text-brand-dark"
                    onClick={() => removeSelected(id)}
                  >
                    ×
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}

      <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
        {tree.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            No categories yet. Create one to get started.
          </p>
        ) : (
          tree
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((node) => (
              <TreeNode
                key={node.category_id}
                node={node}
                selectedIds={selectedIds}
                onToggle={toggleSelect}
                expanded={expanded}
                onExpand={toggleExpanded}
                onDelete={handleDelete}
                searchQuery={searchQuery}
                disabled={disabled}
              />
            ))
        )}
      </div>

      <p className="text-xs text-slate-500">
        {selectedIds.length} selected. Checkboxes allow multi-select.
      </p>
    </div>
  )
}
