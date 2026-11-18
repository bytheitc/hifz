"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Every modal in the app: help, onboarding, confirmations.
 *
 * Built on the native <dialog>, so focus is trapped and Escape closes it
 * without any code of ours that could get it wrong. On a phone it becomes a
 * bottom sheet (globals.css), because that is where a thumb is.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      style={wide ? { maxWidth: "min(52rem, calc(100vw - 1.5rem))" } : undefined}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-panel flex max-h-[inherit] flex-col overflow-hidden rounded-3xl bg-[var(--color-card)] shadow-[var(--shadow-lift)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-rule)] px-5 pb-4 pt-5 sm:px-6">
          <div>
            <h2 id="modal-title" className="text-lg font-bold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-ink)]"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-[var(--color-rule)] px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </dialog>
  );
}
