import { fireEvent, render } from "@testing-library/react-native";
import { ItemsScreen } from "../ItemsScreen";
import { useItems } from "../../hooks/useItems";

jest.mock("../../hooks/useItems", () => ({
  useItems: jest.fn(),
}));

// The real ThemeProvider renders null until an async SecureStore read resolves;
// stub it to render children synchronously with a fixed chart palette so the row
// accent colors resolve without a provider.
jest.mock("../../providers/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: unknown }) => children,
  useTheme: () => ({
    colors: {
      chart1: "#c1",
      chart2: "#c2",
      chart3: "#c3",
      chart4: "#c4",
      chart5: "#c5",
      chart6: "#c6",
      textTertiary: "#64748b",
    },
  }),
}));

const mockUseItems = jest.mocked(useItems);
const fetchNextPage = jest.fn();
const refetch = jest.fn();

function setItems(rows: unknown[], over: Record<string, unknown> = {}) {
  mockUseItems.mockReturnValue({
    data: { pages: [{ cursor: null, has_more: false, data: rows }] },
    error: null,
    fetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch,
    ...over,
  } as never);
}

const sampleRows = [
  {
    id: "item-1",
    name: "Leche entera",
    qty: 2,
    total_minor: 199000,
    currency: "CLP",
    item_category_key: "dairy",
    store_category_key: "supermarket",
    transaction_id: "txn-1",
    transaction_date: "2026-05-20",
    merchant: "Super Lider",
    created_at: "2026-05-20T12:00:00Z",
  },
  {
    id: "item-2",
    name: "Pan",
    qty: 1,
    total_minor: 89000,
    currency: "CLP",
    item_category_key: null,
    store_category_key: "bakery",
    transaction_id: "txn-2",
    transaction_date: "2026-05-21",
    merchant: "Castaño",
    created_at: "2026-05-21T12:00:00Z",
  },
];

describe("ItemsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders item rows from the mocked useItems hook", () => {
    setItems(sampleRows);
    const screen = render(<ItemsScreen />);

    expect(screen.getByTestId("items-screen")).toBeTruthy();
    expect(screen.getByTestId("items-row-0")).toBeTruthy();
    expect(screen.getByTestId("items-row-1")).toBeTruthy();
    expect(screen.getByText("2 x Leche entera")).toBeTruthy();
    expect(screen.getByText("Super Lider", { exact: false })).toBeTruthy();
  });

  it("opens the parent transaction when a row is tapped", () => {
    setItems(sampleRows);
    const navigate = jest.fn();
    const screen = render(<ItemsScreen navigation={{ navigate } as never} />);

    fireEvent.press(screen.getByTestId("items-row-0"));

    expect(navigate).toHaveBeenCalledWith("TransactionDetail", {
      transactionId: "txn-1",
    });
  });

  it("shows the empty state when there are no items", () => {
    setItems([]);
    const screen = render(<ItemsScreen />);

    expect(screen.getByTestId("items-empty")).toBeTruthy();
    expect(screen.getByText("No items yet")).toBeTruthy();
  });

  it("threads the search filter into the items query", () => {
    setItems(sampleRows);
    const screen = render(<ItemsScreen />);

    fireEvent.changeText(screen.getByTestId("items-search"), "leche");

    expect(useItems).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "leche" }),
    );
  });
});
