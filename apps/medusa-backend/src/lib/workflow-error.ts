function readMessageField(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("message" in value)) {
    return undefined
  }
  const message = (value as { message: unknown }).message
  return typeof message === "string" && message.length > 0 ? message : undefined
}

/** Medusa workflow / step errors are often plain objects with a message field. */
export function readWorkflowErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  const direct = readMessageField(error)
  if (direct) {
    return direct
  }

  if (typeof error === "object" && error !== null) {
    const nested = error as {
      cause?: unknown
      error?: unknown
      errors?: unknown[]
    }
    const fromCause = readMessageField(nested.cause)
    if (fromCause) {
      return fromCause
    }
    const fromError = readMessageField(nested.error)
    if (fromError) {
      return fromError
    }
    if (Array.isArray(nested.errors)) {
      for (const item of nested.errors) {
        const msg = readWorkflowErrorMessage(item)
        if (msg !== "Unknown error") {
          return msg
        }
      }
    }
  }

  return "Unknown error"
}
