import { Component } from 'react';

/**
 * ErrorBoundary — isolates widget failures. If a dashboard widget throws
 * during render, only that widget shows a fallback; the rest of the page
 * keeps working (requirement: independent error handling per widget).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('[WidgetError]', this.props.name || 'widget', error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          No se pudo mostrar esta sección.
        </div>
      );
    }
    return this.props.children;
  }
}
