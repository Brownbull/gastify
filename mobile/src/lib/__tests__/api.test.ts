import { attachAuthHeader, setAuthToken } from "../api";
import { getSecureAuthToken } from "../secureAuthToken";

jest.mock("../secureAuthToken", () => ({
  getSecureAuthToken: jest.fn(),
}));

describe("api auth header middleware", () => {
  beforeEach(() => {
    setAuthToken(null);
    jest.clearAllMocks();
  });

  it("adds the in-memory bearer token when available", async () => {
    setAuthToken("memory-token");
    const request = new Request("http://localhost/api/v1/transactions");

    await attachAuthHeader(request);

    expect(request.headers.get("Authorization")).toBe("Bearer memory-token");
    expect(getSecureAuthToken).not.toHaveBeenCalled();
  });

  it("falls back to SecureStore when memory has no token", async () => {
    jest.mocked(getSecureAuthToken).mockResolvedValue("secure-token");
    const request = new Request("http://localhost/api/v1/transactions");

    await attachAuthHeader(request);

    expect(request.headers.get("Authorization")).toBe("Bearer secure-token");
  });

  it("leaves the request unauthenticated when no token exists", async () => {
    jest.mocked(getSecureAuthToken).mockResolvedValue(null);
    const request = new Request("http://localhost/api/v1/transactions");

    await attachAuthHeader(request);

    expect(request.headers.has("Authorization")).toBe(false);
  });
});
