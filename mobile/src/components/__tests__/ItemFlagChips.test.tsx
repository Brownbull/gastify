import { fireEvent, render } from "@testing-library/react-native";
import { ItemFlagChips } from "../ItemFlagChips";
import type { TransactionDetail } from "../../lib/transactions";

type Item = TransactionDetail["items"][number];

function makeItem(flags: string[]): Item {
  return { id: "item-1", name: "Coffee", flags } as unknown as Item;
}

describe("ItemFlagChips", () => {
  it("calls onToggleFlag with the pressed kind", () => {
    const onToggleFlag = jest.fn();
    const item = makeItem(["urgency"]);
    const { getByTestId } = render(
      <ItemFlagChips item={item} disabled={false} onToggleFlag={onToggleFlag} />,
    );

    fireEvent.press(getByTestId("item-flag-item-1-special_case"));
    expect(onToggleFlag).toHaveBeenCalledWith(item, "special_case");
  });

  it("does not fire when disabled", () => {
    const onToggleFlag = jest.fn();
    const { getByTestId } = render(
      <ItemFlagChips item={makeItem([])} disabled onToggleFlag={onToggleFlag} />,
    );

    fireEvent.press(getByTestId("item-flag-item-1-urgency"));
    expect(onToggleFlag).not.toHaveBeenCalled();
  });
});
