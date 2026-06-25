import { type ReactNode } from "react";

/** A full-width social sign-in button (icon + "Continuar con X"). */
export function SocialButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-gt-10 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12 font-gt-display text-gt-md font-extrabold text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center">{icon}</span>
      {label}
    </button>
  );
}
