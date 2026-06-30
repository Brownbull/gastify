import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { initAppearance } from "@/lib/appearance";
import { routeTree } from "./routeTree.gen";
import "@/styles/global.css";

// Reflect the persisted font-family / font-size prefs onto <html> before the
// first paint so the chosen appearance is in place immediately (no flash).
initAppearance();

const router = createRouter({
  routeTree,
  context: {},
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
