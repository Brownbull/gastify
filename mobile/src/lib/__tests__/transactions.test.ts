import {
  getTransaction,
  listTransactions,
  updateTransaction,
} from "../transactions";
import { apiClient } from "../api";

jest.mock("../api", () => ({
  apiClient: {
    GET: jest.fn(),
    PATCH: jest.fn(),
  },
}));

const mockGet = jest.mocked(apiClient.GET);
const mockPatch = jest.mocked(apiClient.PATCH);

describe("transactions api helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes pagination and mobile filters to the transaction list endpoint", async () => {
    mockGet.mockResolvedValue({
      data: { data: [], cursor: null, has_more: false },
      error: undefined,
      response: new Response(),
    } as never);

    await listTransactions({
      cursor: "2026-05-01|txn-1",
      filters: {
        cardAlias: "Visa",
        category: "cat-1",
        currency: "CLP",
        dateFrom: "2026-05-01",
        dateTo: "2026-05-31",
        merchant: "Lider",
      },
      limit: 10,
    });

    expect(mockGet).toHaveBeenCalledWith("/api/v1/transactions", {
      params: {
        query: {
          card_alias: "Visa",
          category: "cat-1",
          currency: "CLP",
          cursor: "2026-05-01|txn-1",
          date_from: "2026-05-01",
          date_to: "2026-05-31",
          limit: 10,
          merchant: "Lider",
        },
      },
    });
  });

  it("loads a transaction detail by id", async () => {
    mockGet.mockResolvedValue({
      data: { id: "txn-1" },
      error: undefined,
      response: new Response(),
    } as never);

    await getTransaction("txn-1");

    expect(mockGet).toHaveBeenCalledWith(
      "/api/v1/transactions/{transaction_id}",
      {
        params: { path: { transaction_id: "txn-1" } },
      },
    );
  });

  it("patches transaction edits through the typed endpoint", async () => {
    mockPatch.mockResolvedValue({
      data: { id: "txn-1" },
      error: undefined,
      response: new Response(),
    } as never);

    await updateTransaction("txn-1", { merchant: "New merchant" });

    expect(mockPatch).toHaveBeenCalledWith(
      "/api/v1/transactions/{transaction_id}",
      {
        body: { merchant: "New merchant" },
        params: { path: { transaction_id: "txn-1" } },
      },
    );
  });

  it("surfaces backend detail messages when a list request fails", async () => {
    mockGet.mockResolvedValue({
      data: undefined,
      error: { detail: "No auth" },
      response: new Response(null, { status: 401 }),
    } as never);

    await expect(listTransactions()).rejects.toThrow("No auth");
  });
});
