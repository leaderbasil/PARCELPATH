import { useUI } from "@/i18n";
import { getErrorMessage } from "@/constants/messages";
import { ApiRequestError } from "@/services/api";
import { Button } from "./Button";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const ui = useUI();
  const message =
    error instanceof ApiRequestError ? getErrorMessage(error.code, error.message) : getErrorMessage("INTERNAL_ERROR");
  return (
    <div role="alert" className="rounded-card border border-danger bg-danger-soft p-6 text-center">
      <p className="text-sm text-danger-strong">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          {ui.common.retry}
        </Button>
      ) : null}
    </div>
  );
}
