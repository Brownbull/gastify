import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { LandingScreen } from "./LandingScreen";
import { SignUpScreen } from "./SignUpScreen";
import { SignInScreen } from "./SignInScreen";

/**
 * Features/Auth/Screens/AuthFlow — the app's entry experience. `Flow` is the live
 * path (landing → sign-up ⇄ sign-in); the rest show each screen alone. The
 * landing is responsive — switch the platform toolbar for the desktop layout.
 */
const meta: Meta = {
  title: "Features/Auth/Screens/AuthFlow",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

type Step = "landing" | "signup" | "signin";

function Flow({ platform }: { platform: Platform }) {
  const [step, setStep] = useState<Step>("landing");
  if (step === "signin")
    return (
      <SignInScreen
        onBack={() => setStep("landing")}
        onSignUp={() => setStep("signup")}
        onSubmit={() => {}}
        onGoogle={() => {}}
        onApple={() => {}}
        onForgot={() => {}}
      />
    );
  if (step === "signup")
    return (
      <SignUpScreen
        onBack={() => setStep("landing")}
        onSignIn={() => setStep("signin")}
        onSubmit={() => {}}
        onGoogle={() => {}}
        onApple={() => {}}
      />
    );
  return <LandingScreen platform={platform} onSignUp={() => setStep("signup")} onSignIn={() => setStep("signin")} />;
}

const surface = (globals: { platform?: string } | undefined, node: ReactNode) => (
  <AppSurface platform={platformFromGlobals(globals)}>{node}</AppSurface>
);

export const Flow_: Story = { name: "Flow", render: (_a, { globals }) => surface(globals, <Flow platform={platformFromGlobals(globals)} />) };
export const Landing: Story = {
  render: (_a, { globals }) => surface(globals, <LandingScreen platform={platformFromGlobals(globals)} onSignUp={() => {}} onSignIn={() => {}} />),
};
export const SignUp: Story = {
  render: (_a, { globals }) => surface(globals, <SignUpScreen onBack={() => {}} onSignIn={() => {}} onSubmit={() => {}} onGoogle={() => {}} onApple={() => {}} />),
};
export const SignIn: Story = {
  render: (_a, { globals }) =>
    surface(globals, <SignInScreen onBack={() => {}} onSignUp={() => {}} onSubmit={() => {}} onGoogle={() => {}} onApple={() => {}} onForgot={() => {}} />),
};
