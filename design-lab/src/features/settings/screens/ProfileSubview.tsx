import { useState } from "react";
import { Button } from "@design-system/atoms/Button";
import { Input } from "@design-system/atoms/Input";
import { Badge } from "@design-system/atoms/Badge";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { SettingsSubviewShell, SettingsGroupHeading, SettingsField } from "../components/SettingsSubviewShell";

/**
 * Perfil subview — user profile + the Google-linked account. Centered avatar
 * header, a "Cuenta" form (name / email read-only / phone with a +56 prefix),
 * the linked-account product row, and a full-width save action.
 */

/** Phone field: a fixed "+56" prefix box next to a controlled number Input. */
function ProfileSubviewPhoneInput({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <div className="flex items-end gap-gt-8">
      <span className="shrink-0 self-stretch rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-8 font-gt-display text-gt-md font-bold leading-none text-gt-ink-2">
        +56
      </span>
      <Input
        className="flex-1"
        aria-label="Teléfono"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="9 8123 4567"
        inputMode="tel"
      />
    </div>
  );
}

/** Google brand "G" glyph — literal vendor logo, so brand hex is intentional. */
function ProfileSubviewGoogleGlyph() {
  return (
    <svg className="shrink-0" width={20} height={20} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export function ProfileSubview({ onBack }: { onBack?: () => void }) {
  const [name, setName] = useState("Rodrigo Bravo");
  const [phone, setPhone] = useState("9 8123 4567");
  const email = "rodrigo.bravo@gmail.com";

  return (
    <SettingsSubviewShell title="Perfil" onBack={onBack}>
      {/* Centered avatar header — layout-only wrapper, no border/shadow. */}
      <div className="flex flex-col items-center gap-gt-6">
        <div
          className="grid place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface"
          style={{ width: 88, height: 88 }}
        >
          <PixelIcon name="cat-snowshoe-v2" size={64} alt="Avatar" />
        </div>
        <Button variant="ghost" size="sm">Cambiar foto</Button>
      </div>

      {/* Cuenta form */}
      <SettingsGroupHeading>Cuenta</SettingsGroupHeading>
      <SettingsField label="Nombre">
        <Input aria-label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
      </SettingsField>
      <SettingsField label="Correo" hint="Vinculado a tu cuenta de Google">
        <Input aria-label="Correo" value={email} disabled readOnly />
      </SettingsField>
      <SettingsField label="Teléfono">
        <ProfileSubviewPhoneInput value={phone} onChange={setPhone} />
      </SettingsField>

      {/* Cuenta vinculada — product row */}
      <SettingsGroupHeading>Cuenta vinculada</SettingsGroupHeading>
      <div className="flex items-center gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12 shadow-gt-sm">
        <ProfileSubviewGoogleGlyph />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Google</span>
          <span className="truncate text-gt-sm text-gt-ink-3">{email}</span>
        </div>
        <Badge tone="positive">Conectado</Badge>
      </div>

      {/* Save */}
      <Button variant="primary" fullWidth className="mt-gt-4">Guardar cambios</Button>
    </SettingsSubviewShell>
  );
}
