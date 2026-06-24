import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { OnboardingScreen } from "./OnboardingScreen";
import { SignUpScreen } from "./SignUpScreen";
import { SignInScreen } from "./SignInScreen";

/**
 * Features/Auth/Screens/AuthFlow — the app's entry experience. `Flow` is the
 * live path (onboarding → sign-up ⇄ sign-in); the rest show each screen alone.
 */
const meta: Meta = {
  title: "Features/Auth/Screens/AuthFlow",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

type Step = "onboarding" | "signup" | "signin";

function Flow() {
  const [step, setStep] = useState<Step>("onboarding");
  if (step === "onboarding") return <OnboardingScreen onDone={() => setStep("signup")} />;
  if (step === "signin")
    return (
      <SignInScreen
        onBack={() => setStep("signup")}
        onSignUp={() => setStep("signup")}
        onSubmit={() => {}}
        onGoogle={() => {}}
        onApple={() => {}}
        onForgot={() => {}}
      />
    );
  return (
    <SignUpScreen
      onBack={() => setStep("onboarding")}
      onSignIn={() => setStep("signin")}
      onSubmit={() => {}}
      onGoogle={() => {}}
      onApple={() => {}}
    />
  );
}

const surface = (globals: { platform?: string } | undefined, node: ReactNode) => (
  <AppSurface platform={platformFromGlobals(globals)}>{node}</AppSurface>
);

export const Flow_: Story = { name: "Flow", render: (_a, { globals }) => surface(globals, <Flow />) };
export const Onboarding: Story = { render: (_a, { globals }) => surface(globals, <OnboardingScreen onDone={() => {}} />) };
export const SignUp: Story = {
  render: (_a, { globals }) => surface(globals, <SignUpScreen onBack={() => {}} onSignIn={() => {}} onSubmit={() => {}} onGoogle={() => {}} onApple={() => {}} />),
};
export const SignIn: Story = {
  render: (_a, { globals }) =>
    surface(globals, <SignInScreen onBack={() => {}} onSignUp={() => {}} onSubmit={() => {}} onGoogle={() => {}} onApple={() => {}} onForgot={() => {}} />),
};
