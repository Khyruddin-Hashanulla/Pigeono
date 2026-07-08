import { Component } from 'react'

/**
 * Catches render errors in its subtree so one crashing page/section
 * doesn't take down the whole app. Wrap routes or risky sections.
 */
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[pigeono] UI error boundary caught:', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground text-balance">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
