import type { ReactNode } from "react";
import { UI } from "@/constants/ui";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-overlay/40 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-card w-full max-w-md rounded-card bg-surface p-6 shadow-xl ring-1 ring-border/60"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <Button variant="ghost" aria-label={UI.common.close} onClick={onClose}>
            ×
          </Button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
