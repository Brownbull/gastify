import { listItems } from "../items";
import { apiClient } from "../api";

jest.mock("../api", () => ({
  apiClient: {
    GET: jest.fn(),
  },
}));

const mockGet = jest.mocked(apiClient.GET);

describe("items api helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes pagination, filters, and the active group id to the items endpoint", async () => {
    mockGet.mockResolvedValue({
      data: { data: [], cursor: null, has_more: false },
      error: undefined,
      response: new Response(),
    } as never);

    await listItems({
      cursor: "2026-05-01|item-1",
      filters: {
        dateFrom: "2026-05-01",
        dateTo: "2026-05-31",
        itemCategoryId: "icat-1",
        merchant: "Lider",
        search: "milk",
        storeCategoryId: "scat-1",
      },
      groupId: "grp-1",
      limit: 10,
    });

    expect(mockGet).toHaveBeenCalledWith("/api/v1/items", {
      params: {
        query: {
          cursor: "2026-05-01|item-1",
          date_from: "2026-05-01",
          date_to: "2026-05-31",
          group_id: "grp-1",
          item_category_id: "icat-1",
          limit: 10,
          merchant: "Lider",
          search: "milk",
          store_category_id: "scat-1",
        },
      },
    });
  });

  it("omits the group id when scope is personal", async () => {
    mockGet.mockResolvedValue({
      data: { data: [], cursor: null, has_more: false },
      error: undefined,
      response: new Response(),
    } as never);

    await listItems({ filters: { search: "bread" } });

    expect(mockGet).toHaveBeenCalledWith("/api/v1/items", {
      params: {
        query: expect.objectContaining({
          group_id: undefined,
          search: "bread",
        }),
      },
    });
  });

  it("surfaces backend detail messages when the request fails", async () => {
    mockGet.mockResolvedValue({
      data: undefined,
      error: { detail: "No auth" },
      response: new Response(null, { status: 401 }),
    } as never);

    await expect(listItems()).rejects.toThrow("No auth");
  });
});
