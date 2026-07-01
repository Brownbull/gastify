import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Modal } from "./Modal";

/**
 * a11y regression guards for the shared Modal atom (role=dialog): it must carry an
 * accessible name and move focus into the panel on open (WCAG 4.1.2 + 2.4.3).
 */
describe("Modal a11y", () => {
  it("names the dialog via aria-labelledby → the visible title", () => {
    render(
      <Modal open onClose={() => {}} title="Eliminar cuenta">
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    const labelledby = dialog.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();
    expect(document.getElementById(labelledby!)?.textContent).toBe("Eliminar cuenta");
  });

  it("falls back to aria-label when there is no visible title", () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="Confirmar acción">
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Confirmar acción");
    expect(dialog).not.toHaveAttribute("aria-labelledby");
  });

  it("moves focus into the dialog panel on open (WCAG 2.4.3)", async () => {
    render(
      <Modal open onClose={() => {}} title="Hola">
        <button type="button">inside</button>
      </Modal>,
    );
    const panel = screen.getByRole("dialog").querySelector('[tabindex="-1"]') as HTMLElement;
    expect(panel).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(panel));
  });
});
