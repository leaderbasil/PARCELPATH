import { Link } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { BackIcon } from "@/components/common/Icons";
import { useUI } from "@/i18n";

export default function NotFound() {
  const ui = useUI();
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-5xl font-semibold text-primary">404</p>
        <h1 className="mt-4 text-xl font-semibold text-text">{ui.errors.notFoundTitle}</h1>
        <p className="mt-2 text-sm text-text-muted">{ui.errors.notFoundBody}</p>
        <Link to="/" className="mt-6 inline-block">
          <Button variant="secondary">
            <BackIcon className="h-4 w-4" />
            {ui.common.back}
          </Button>
        </Link>
      </div>
    </div>
  );
}
