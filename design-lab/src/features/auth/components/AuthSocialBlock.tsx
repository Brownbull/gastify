import { SocialButton } from "./SocialButton";
import { GoogleGlyph, AppleGlyph } from "./BrandGlyph";

/** The Google + Apple buttons and the "o con tu correo" divider, shared by both auth screens. */
export function AuthSocialBlock({ onGoogle, onApple }: { onGoogle?: () => void; onApple?: () => void }) {
  return (
    <div className="flex flex-col gap-gt-12">
      <div className="flex flex-col gap-gt-8">
        <SocialButton icon={<GoogleGlyph />} label="Continuar con Google" onClick={onGoogle} />
        <SocialButton icon={<AppleGlyph size={22} />} label="Continuar con Apple" onClick={onApple} />
      </div>
      <div className="flex items-center gap-gt-8">
        <span className="h-0.5 flex-1 bg-gt-line" />
        <span className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">o con tu correo</span>
        <span className="h-0.5 flex-1 bg-gt-line" />
      </div>
    </div>
  );
}
