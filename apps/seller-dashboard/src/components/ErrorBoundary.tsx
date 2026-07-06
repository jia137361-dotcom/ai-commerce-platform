import React from "react"

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-bold text-red-600">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-600">{this.state.error?.message}</p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm text-white"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
