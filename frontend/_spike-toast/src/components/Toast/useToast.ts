/**
 * useToast — convenience hook for dispatching toasts from anywhere
 * inside the ToastProvider subtree.
 */
import { useContext } from "react";
import { ToastContext } from "./ToastProvider";
import type { ToastType } from "./Toast.types";

interface ToastDispatchOptions {
  title?: string;
  duration?: number;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be called inside a <ToastProvider>.");
  }

  const dispatch = (type: ToastType, message: string, options?: ToastDispatchOptions) =>
    ctx.push(type, message, options);

  return {
    success: (message: string, options?: ToastDispatchOptions) => dispatch("success", message, options),
    info: (message: string, options?: ToastDispatchOptions) => dispatch("info", message, options),
    warning: (message: string, options?: ToastDispatchOptions) => dispatch("warning", message, options),
    error: (message: string, options?: ToastDispatchOptions) => dispatch("error", message, options),
    dismiss: ctx.dismiss,
  };
}
