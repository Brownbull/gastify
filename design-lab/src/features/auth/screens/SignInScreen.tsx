import { useState } from "react";
import { ChevronLeftIcon } from "@design-system/assets/icons";
import { Button } from "@design-system/atoms/Button";
import { Wordmark } from "@design-system/organisms/Nav";
import { AuthField } from "../components/AuthField";
import { AuthSocialBlock } from "../components/AuthSocialBlock";

/**
 * SignInScreen — return to an account: Google/Apple or email/password, with a
 * forgot-password link and a switch to sign up. Full-surface (no shell).
 */
export interface SignInScreenProps {
  onBack?: () => void;
  onSubmit?: () => void;
  onGoogle?: () => void;
  onApple?: () => void;
  onForgot?: () => void;
  onSignUp?: () => void;
}

export function SignInScreen({ onBack, onSubmit, onGoogle, onApple, onForgot, onSignUp }: SignInScreenProps) {
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
          <h1 className="mt-gt-4 font-gt-display text-gt-3xl font-extrabold text-gt-ink">Bienvenido de vuelta</h1>
          <p className="text-gt-sm font-medium text-gt-ink-2">Ingresa para seguir con tus gastos.</p>
        </div>

        <AuthSocialBlock onGoogle={onGoogle} onApple={onApple} />

        <div className="flex flex-col gap-gt-12">
          <AuthField label="Correo" type="email" inputMode="email" placeholder="tucorreo@ejemplo.cl" autoComplete="email" />
          <div className="flex flex-col gap-gt-4">
            <AuthField
              label="Contraseña"
              type={showPw ? "text" : "password"}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              trailing={
                <button type="button" onClick={() => setShowPw((s) => !s)} className="shrink-0 font-gt-display text-gt-xs font-extrabold text-gt-primary">
                  {showPw ? "Ocultar" : "Mostrar"}
                </button>
              }
            />
            <button type="button" onClick={onForgot} className="self-end font-gt-display text-gt-xs font-extrabold text-gt-primary">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <Button variant="primary" fullWidth onClick={onSubmit}>Iniciar sesión</Button>

        <p className="mt-auto text-center text-gt-sm font-bold text-gt-ink-2">
          ¿No tienes cuenta?{" "}
          <button type="button" onClick={onSignUp} className="font-gt-display font-extrabold text-gt-primary">Crear cuenta</button>
        </p>
      </div>
    </div>
  );
}
