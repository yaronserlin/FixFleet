import React from 'react';
import ErrorPage from '../../pages/ErrorPage';

/**
 * Catches render crashes and shows the crash page. routes.jsx mounts one
 * inside the app layout keyed by pathname (nav stays, navigating away
 * recovers); main.jsx keeps one at the root as the last resort.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code="Oops"
          title="Something went wrong"
          message="An unexpected error occurred while showing this page. Try again, or head back home."
          actions={[
            { label: 'Try again', onClick: () => window.location.reload() },
            { label: 'Go home', href: '/' },
          ]}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
