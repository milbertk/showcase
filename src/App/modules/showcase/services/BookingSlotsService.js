import { APIShao } from "../../../shared/Utils/globalVar";

export class BookingSlotsServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "BookingSlotsServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class BookingSlotsService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Loads the bookable slots of a product on a given date.
   *
   * Backend route (public, read-only):
   * GET /public/companies/{companyId}/products/{productId}/slots?date=YYYY-MM-DD
   *
   * Returns the raw payload: { status, message, result: {
   *   date, mode, available, reason, slots: [{ startTime, endTime, allDay,
   *   capacity, taken, remaining, source }] } }.
   */
  async getSlots({ companyId, productId, date, signal } = {}) {
    const c = String(companyId || "").trim();
    const p = String(productId || "").trim();
    const d = String(date || "").trim();

    if (!c) throw new TypeError("The company ID is required.");
    if (!p) throw new TypeError("The product ID is required.");
    if (!d) throw new TypeError("The date is required.");

    const requestUrl =
      `${this.baseUrl}/public/companies/` +
      `${encodeURIComponent(c)}/products/` +
      `${encodeURIComponent(p)}/slots?date=${encodeURIComponent(d)}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new BookingSlotsServiceError(
        data?.message || `Error loading slots: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
  }

  /** Convenience helper: returns just the availability object or null. */
  async getDayAvailability(request = {}) {
    const response = await this.getSlots(request);
    return response?.result || null;
  }
}

async function readResponse(response) {
  const rawText = await response.text();
  if (!rawText) return {};
  try {
    return JSON.parse(rawText);
  } catch {
    return { message: rawText };
  }
}
