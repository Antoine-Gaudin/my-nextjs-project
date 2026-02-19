"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Modal de confirmation pour les actions destructrices.
 * @param {object} props
 * @param {boolean} props.open - Afficher le modal
 * @param {string} props.title - Titre du modal
 * @param {string} props.message - Message de confirmation
 * @param {string} [props.confirmLabel="Confirmer"] - Texte du bouton confirmer
 * @param {string} [props.cancelLabel="Annuler"] - Texte du bouton annuler
 * @param {"danger"|"warning"|"info"} [props.variant="danger"] - Style du bouton
 * @param {() => void} props.onConfirm - Callback à la confirmation
 * @param {() => void} props.onCancel - Callback à l'annulation
 */
export default function ConfirmDialog({
  open,
  title = "Confirmer l'action",
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const trapFocus = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    dialog.addEventListener("keydown", trapFocus);
    return () => dialog.removeEventListener("keydown", trapFocus);
  }, [open]);

  if (!open) return null;

  const btnStyles = {
    danger: "bg-red-600 hover:bg-red-500 text-white",
    warning: "bg-amber-600 hover:bg-amber-500 text-white",
    info: "bg-indigo-600 hover:bg-indigo-500 text-white",
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
      >
        <h3 id="confirm-dialog-title" className="text-lg font-semibold text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${btnStyles[variant] || btnStyles.danger}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
