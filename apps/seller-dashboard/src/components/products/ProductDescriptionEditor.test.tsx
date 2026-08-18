import { act, useState } from "react"
import { createRoot } from "react-dom/client"
import { describe, expect, it, vi } from "vitest"
import { ProductDescriptionEditor } from "./ProductDescriptionEditor"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("ProductDescriptionEditor", () => {
  it("provides formatting controls and emits edited HTML", () => {
    const onChange = vi.fn()
    const container = document.createElement("div")
    const root = createRoot(container)
    act(() => {
      root.render(<ProductDescriptionEditor value="A useful product" onChange={onChange} />)
    })

    const editor = container.querySelector<HTMLElement>('[role="textbox"]')
    expect(editor?.textContent).toContain("A useful product")
    expect(container.querySelector('button[aria-label="Paragraph"]')).toBeNull()
    expect(container.querySelector('button[aria-label="Bold"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Italic"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Bulleted list"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Numbered list"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Decrease indent"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Increase indent"]')).not.toBeNull()

    expect(editor).not.toBeNull()
    if (!editor) throw new Error("Description editor was not rendered")
    editor.innerHTML = "<p>A <strong>formatted</strong> product</p>"
    act(() => {
      editor.dispatchEvent(new Event("input", { bubbles: true }))
    })

    expect(onChange).toHaveBeenLastCalledWith("<p>A <strong>formatted</strong> product</p>")
    act(() => root.unmount())
  })

  it("does not rewrite the editor after controlled keyboard input", () => {
    function ControlledEditor() {
      const [value, setValue] = useState("")
      return <ProductDescriptionEditor value={value} onChange={setValue} />
    }

    const container = document.createElement("div")
    const root = createRoot(container)
    act(() => {
      root.render(<ControlledEditor />)
    })

    const editor = container.querySelector<HTMLElement>('[role="textbox"]')
    expect(editor).not.toBeNull()
    if (!editor) throw new Error("Description editor was not rendered")

    let html = editor.innerHTML
    let writes = 0
    Object.defineProperty(editor, "innerHTML", {
      configurable: true,
      get: () => html,
      set: (nextHtml: string) => {
        writes += 1
        html = nextHtml
      },
    })
    html = "<p>ftsh</p>"
    act(() => {
      editor.dispatchEvent(new Event("input", { bubbles: true }))
    })

    expect(html).toBe("<p>ftsh</p>")
    expect(writes).toBe(0)
    act(() => root.unmount())
  })
})
