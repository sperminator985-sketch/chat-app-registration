import { Component, ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Сбой интерфейса:', error, info.componentStack);
  }

  reload = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()))
        .catch(() => undefined);
    }
    if (window.caches) {
      caches
        .keys()
        .then((ks) => ks.forEach((k) => caches.delete(k)))
        .catch(() => undefined);
    }
    window.setTimeout(() => window.location.reload(), 250);
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-wide text-foreground">
          В общаге вырубило свет
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Страница не загрузилась. Нажми кнопку — вахтёрша включит рубильник.
        </p>
        <button onClick={this.reload} className="btn-brut">
          Перезагрузить
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
