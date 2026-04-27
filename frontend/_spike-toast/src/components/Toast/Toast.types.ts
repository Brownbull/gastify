/**
 * Toast prop types — emitted by /gabe-mockup spike toast --system.
 */
export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastProps {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  onDismiss: (id: string) => void;
  /** Duration in ms before auto-dismiss. 0 = sticky (manual close only). */
  duration?: number;
}

export interface ToastEntry extends ToastProps {
  createdAt: number;
}
