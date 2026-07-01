import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select, type SelectOption } from "./Select";

const OPTIONS: SelectOption[] = [
  { value: "santiago", label: "Santiago" },
  { value: "arica", label: "Arica" },
  { value: "antofagasta", label: "Antofagasta" },
  { value: "iquique", label: "Iquique" },
  { value: "nunoa", label: "Ñuñoa" },
];

// jsdom doesn't implement scrollIntoView.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderSelect(props: Partial<React.ComponentProps<typeof Select>> = {}) {
  const onChange = vi.fn();
  render(<Select testId="city" value="" onChange={onChange} options={OPTIONS} {...props} />);
  fireEvent.click(screen.getByTestId("city")); // open the panel
  return { onChange };
}

const active = () => screen.getByTestId("city").getAttribute("aria-activedescendant");

describe("Select type-ahead + keyboard nav", () => {
  it("jumps to the first option starting with the typed letter", () => {
    renderSelect();
    fireEvent.keyDown(window, { key: "a" });
    expect(active()).toBe("city-option-arica");
  });

  it("cycles through matches when the same letter is pressed repeatedly", () => {
    renderSelect();
    fireEvent.keyDown(window, { key: "a" }); // Arica
    fireEvent.keyDown(window, { key: "a" }); // Antofagasta (next 'a')
    expect(active()).toBe("city-option-antofagasta");
  });

  it("is accent-insensitive ('n' matches 'Ñuñoa')", () => {
    renderSelect();
    fireEvent.keyDown(window, { key: "n" });
    expect(active()).toBe("city-option-nunoa");
  });

  it("Enter picks the highlighted option", () => {
    const { onChange } = renderSelect();
    fireEvent.keyDown(window, { key: "i" }); // Iquique
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("iquique");
  });

  it("ArrowDown / ArrowUp move the highlight", () => {
    renderSelect({ value: "santiago" }); // opens highlighting the selected (index 0)
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(active()).toBe("city-option-arica"); // index 1
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(active()).toBe("city-option-santiago"); // back to index 0
  });
});
