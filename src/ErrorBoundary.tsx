import { Component, type ReactNode } from "react"
import { reset } from "@/lib/store"

// A bad save should never leave a blank screen the night before a recital.
export default class ErrorBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="mx-auto max-w-md p-6 text-foreground">
        <h1 className="slab text-2xl font-bold">Something broke</h1>
        <p className="mt-2 text-muted-foreground">Your saved progress may be unreadable. Reload first. If it keeps happening, reset progress.</p>
        <div className="mt-4 flex gap-3">
          <button className="min-h-12 bg-primary px-4 font-bold text-primary-foreground" onClick={() => location.reload()}>Reload</button>
          <button className="min-h-12 border border-border px-4" onClick={() => { reset(); location.reload() }}>Reset progress</button>
        </div>
      </div>
    )
  }
}
