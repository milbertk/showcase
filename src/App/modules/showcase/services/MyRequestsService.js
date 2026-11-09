import { APIShao } from "../../../shared/Utils/globalVar";

export class MyRequestsError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = "MyRequestsError";
    this.status = status;
  }
}

/**
 * "My orders / My bookings" of the SIGNED-IN customer in one store.
 *
 *   GET /public/companies/{companyKey}/my-requests   (companyKey = id or slug)
 *
 * Uses the session cookie (credentials: "include"). 401 = not signed in.
 * Result: { email, emailVerified, currencySymbol, paymentInstructions,
 *           orders: [...], bookings: [...] }
 */
export default class MyRequestsService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  async getMyRequests({ companyKey, signal } = {}) {
    const key = String(companyKey || "").trim();
    if (!key) throw new TypeError("The store is required.");

    let response;
    try {
      response = await fetch(
        `${this.baseUrl}/public/companies/${encodeURIComponent(key)}/my-requests`,
        {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal,
        },
      );
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      throw new MyRequestsError("The server could not be reached.", { status: 0 });
    }

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      throw new MyRequestsError(data?.message || `Error ${response.status}`, {
        status: response.status,
      });
    }
    return data?.result || { orders: [], bookings: [] };
  }
}
