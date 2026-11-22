import { UI } from "@/constants/ui";

export function LoadingState() {
  return (
    <div role="status" className="p-8 text-center text-sm text-text-muted">
      {UI.common.loading}
    </div>
  );
}
