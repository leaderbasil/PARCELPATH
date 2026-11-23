import { Link } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { BackIcon } from "@/components/common/Icons";
import { UI } from "@/constants/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-5xl font-semibold text-primary">404</p>
        <h1 className="mt-4 text-xl font-semibold text-text">{UI.errors.notFoundTitle}</h1>
        <p className="mt-2 text-sm text-text-muted">{UI.errors.notFoundBody}</p>
        <Link to="/" className="mt-6 inline-block">
          <Button variant="secondary">
            <BackIcon className="h-4 w-4" />
            {UI.common.back}
          </Button>
        </Link>
      </div>
    </div>
  );
}
