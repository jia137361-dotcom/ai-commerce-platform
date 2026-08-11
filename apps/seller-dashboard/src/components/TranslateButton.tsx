import { useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiFetch } from "../lib/api-client"

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh", label: "Chinese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
]

type Props = {
  text: string
  onTranslated: (translated: string) => void
  disabled?: boolean
}

export function TranslateButton({ text, onTranslated, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [undoText, setUndoText] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const translateMutation = useMutation({
    mutationFn: (target: string) => {
      const hasChinese = /[\u4e00-\u9fff]/.test(text)
      const source = hasChinese ? "zh" : "en"
      return apiFetch<{ translated: string }>("/admin/translate", {
        method: "POST",
        body: JSON.stringify({ text, source, target }),
      })
    },
    onSuccess: (res) => {
      setUndoText(text)
      onTranslated(res.translated)
      setOpen(false)
    },
    onError: (err: any) => {
      alert(err?.message ?? "Translation failed")
    },
  })

  const handleUndo = () => {
    if (undoText !== null) {
      onTranslated(undoText)
      setUndoText(null)
    }
  }

  return (
    <div className="relative inline-flex items-center gap-1" ref={ref}>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
        title="Translate"
        disabled={disabled || !text.trim()}
        onClick={() => setOpen(!open)}
      >
        🌐
      </button>
      {undoText !== null && (
        <button
          type="button"
          className="text-xs text-brand hover:underline"
          onClick={handleUndo}
        >
          Undo
        </button>
      )}
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1 text-xs font-semibold text-slate-500">Translate to...</p>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className="flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
              disabled={translateMutation.isPending}
              onClick={() => translateMutation.mutate(lang.code)}
            >
              {lang.label}
              {translateMutation.isPending && (
                <span className="ml-auto text-xs text-slate-400">...</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
