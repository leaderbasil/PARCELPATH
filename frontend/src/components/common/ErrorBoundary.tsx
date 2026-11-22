import { Component, type ErrorInfo, type ReactNode } from "react";
import { UI } from "@/constants/ui";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Page error", error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h1 className="text-xl font-semibold text-text">{UI.errors.boundaryTitle}</h1>
          <a href="/" className="mt-4 inline-block text-primary underline">
            {UI.common.back}
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
