import { useState } from "react";

/**
 * Staged-edit helper — holds local draft changes over a `saved` baseline until the
 * host explicitly applies or discards them, so a screen batches its writes instead
 * of firing one per control change.
 *
 * `value` is the saved baseline merged with any draft edits (derived during render,
 * no set-state-in-effect); `dirty` is true when a draft field differs from saved.
 * `set` patches one or more fields; `reset` clears the draft (discard / post-apply).
 */
export function useDraft<T extends Record<string, string>>(saved: T) {
  const [draft, setDraft] = useState<Partial<T>>({});

  const value = { ...saved, ...draft } as T;
  const dirty = (Object.keys(draft) as (keyof T)[]).some((k) => draft[k] !== saved[k]);

  const set = (patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch }));
  const reset = () => setDraft({});

  return { value, dirty, draft, set, reset };
}
