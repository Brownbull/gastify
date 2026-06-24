import { useState } from "react";
import { ChevronLeftIcon } from "@design-system/assets/icons";
import { Button } from "@design-system/atoms/Button";
import { Wordmark } from "@design-system/organisms/Nav";
import { AuthField } from "../components/AuthField";
import { AuthSocialBlock } from "../components/AuthSocialBlock";

/**
 * SignUpScreen — create an account: Google/Apple social sign-in or the
 * name/email/password form, with a switch to sign in. Full-surface (no shell).
 */
export interface SignUpScreenProps {
  onBack?: () => void;
  onSubmit?: () => void;
  onGoogle?: () => void;
  onApple?: () => void;
  onSignIn?: () => void;
}

export function SignUpScreen({ onBack, onSubmit, onGoogle, onApple, onSignIn }: SignUpScreenProps) {
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gt-bg">
      <div className="flex items-center px-gt-16 pt-gt-16">
        {onBack ? (
          <button type="button" aria-label="Volver" onClick={onBack} className="-ml-gt-4 grid h-8 w-8 place-items-center text-gt-ink transition hover:-translate-x-0.5">
            <ChevronLeftIcon className="h-7 w-7" />
          </button>
        ) : null}
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-gt-16 px-gt-20 pb-gt-24">
        <div className="flex flex-col items-center gap-gt-4 text-center">
          <Wordmark />
          <h1 className="mt-gt-4 font-gt-display text-gt-3xl font-extrabold text-gt-ink">Crea tu cuenta</h1>
          <p className="text-gt-sm font-medium text-gt-ink-2">Escanea, organiza y comparte tus gastos.</p>
        </div>

        <AuthSocialBlock onGoogle={onGoogle} onApple={onApple} />

        <div className="flex flex-col gap-gt-12">
          <AuthField label="Nombre" type="text" placeholder="¿Cómo te llamas?" autoComplete="name" />
          <AuthField label="Correo" type="email" inputMode="email" placeholder="tucorreo@ejemplo.cl" autoComplete="email" />
          <AuthField
            label="Contraseña"
            type={showPw ? "text" : "password"}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            trailing={
              <button type="button" onClick={() => setShowPw((s) => !s)} className="shrink-0 font-gt-display text-gt-xs font-extrabold text-gt-primary">
                {showPw ? "Ocultar" : "Mostrar"}
              </button>
            }
          />
        </div>

        <Button variant="primary" fullWidth onClick={onSubmit}>Crear cuenta</Button>

        <p className="text-center text-gt-xs font-medium text-gt-ink-3">
          Al continuar aceptas los <span className="font-extrabold text-gt-ink-2">Términos</span> y la <span className="font-extrabold text-gt-ink-2">Privacidad</span>.
        </p>

        <p className="mt-auto text-center text-gt-sm font-bold text-gt-ink-2">
          ¿Ya tienes cuenta?{" "}
          <button type="button" onClick={onSignIn} className="font-gt-display font-extrabold text-gt-primary">Iniciar sesión</button>
        </p>
      </div>
    </div>
  );
}
