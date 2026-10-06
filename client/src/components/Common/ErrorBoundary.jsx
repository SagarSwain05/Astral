import { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-space-900 stars-bg flex items-center justify-center px-6">
          <div className="max-w-lg w-full text-center">
            <div className="glass p-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-risk-high/20 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-risk-high" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">
                Something Went Wrong
              </h1>
              <p className="text-white/50 mb-2">
                An unexpected error occurred. This has been logged.
              </p>
              {this.state.error && (
                <p className="text-white/30 text-sm mb-8 font-mono bg-space-800/50 rounded-lg p-3 max-h-24 overflow-auto">
                  {this.state.error.message}
                </p>
              )}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReload}
                  className="btn-primary flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
