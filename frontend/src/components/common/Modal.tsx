import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { UI } from "@/constants/ui";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

let openModalCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";

function lockPageScroll(): void {
  if (openModalCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
  }
  openModalCount += 1;
}

function unlockPageScroll(): void {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
  }
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    lockPageScroll();
    return unlockPageScroll;
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-overlay/65 p-3 backdrop-blur-2xl backdrop-saturate-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-card max-h-[calc(100dvh-1.5rem)] w-full min-w-0 max-w-md overflow-y-auto rounded-card bg-surface p-4 shadow-xl ring-1 ring-border/60 overscroll-contain sm:max-h-[calc(100dvh-2rem)] sm:p-6"
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
    </div>,
    document.body
  );
}
