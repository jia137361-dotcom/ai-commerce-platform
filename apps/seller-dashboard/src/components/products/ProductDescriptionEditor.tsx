import { useLayoutEffect, useRef } from "react"

type ProductDescriptionEditorProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const commands: Array<{ label: string; command: string; value?: string }> = [
  { label: "Bold", command: "bold" },
  { label: "Italic", command: "italic" },
  { label: "Bulleted list", command: "insertUnorderedList" },
  { label: "Numbered list", command: "insertOrderedList" },
  { label: "Decrease indent", command: "outdent" },
  { label: "Increase indent", command: "indent" },
] as const

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

const toEditorHtml = (value: string) => {
  if (!value) return ""
  if (/<\s*\/?\s*[a-z][^>]*>/i.test(value)) return value
  return `<p>${escapeHtml(value).replace(/\r?\n/g, "<br />")}</p>`
}

export function ProductDescriptionEditor({ value, onChange, disabled = false }: ProductDescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastRenderedHtmlRef = useRef<string | null>(null)
  const editorHtml = toEditorHtml(value)

  useLayoutEffect(() => {
    if (editorRef.current && lastRenderedHtmlRef.current !== editorHtml) {
      editorRef.current.innerHTML = editorHtml
      lastRenderedHtmlRef.current = editorHtml
    }
  }, [editorHtml])

  const runCommand = (command: string, commandValue?: string) => {
    if (disabled) return
    editorRef.current?.focus()
    document.execCommand(command, false, commandValue)
    const html = editorRef.current?.innerHTML ?? ""
    lastRenderedHtmlRef.current = html
    onChange(html)
  }

  return (
    <div className="mt-1 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
        {commands.map((item) => (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand(item.command, item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label="Description editor"
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        className="product-description-editor__content min-h-[132px] px-3 py-2 text-sm leading-6 text-slate-800 outline-none"
        onInput={(event) => {
          const html = event.currentTarget.innerHTML
          lastRenderedHtmlRef.current = html
          onChange(html)
        }}
      />
    </div>
  )
}
