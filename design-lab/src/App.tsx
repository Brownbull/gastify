import { GeometricGrammar } from "@design-system/_design/TokenShowcase";

/**
 * Dev preview entry. Storybook (npm run storybook) is the canonical
 * inspection surface; this page is a quick sanity check for `npm run dev`.
 */
export default function App() {
  return (
    <main className="min-h-screen bg-gt-bg p-8">
      <h1 className="font-gt-display text-gt-3xl font-extrabold text-gt-primary">gastify design lab</h1>
      <p className="mb-6 text-gt-md text-gt-ink-2">
        Playful Geometric — single theme. Canonical viewer: Storybook (port 6008).
      </p>
      <GeometricGrammar />
    </main>
  );
}
