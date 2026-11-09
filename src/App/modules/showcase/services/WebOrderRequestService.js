import { APIShao } from "../../../shared/Utils/globalVar"

export class WebOrderRequestServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "WebOrderRequestServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class WebOrderRequestService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Sends a guest web order (cart) from the public showcase.
   *
   * Backend route (public, no auth):
   * POST /public/companies/{companyId}/web-order-requests
   *
   * @param {object} params
   * @param {string} params.companyId
   * @param {object} params.order  {
   *   orderType, useRegisteredCustomer, customerId, customerName, phone, email,
   *   socialLink, preferredContact, contactValue, region, address, notes,
   *   items: [{ productId, productCode, productName, quantity, unitPrice }] }
   */
  // captchaToken: Cloudflare Turnstile token (2026-10-25), sent as X-Captcha-Token.
  async createWebOrder({ companyId, order, captchaToken = "", signal } = {}) {
    const c = String(companyId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!order || typeof order !== "object") {
      throw new TypeError("The order object is required.");
    }

    const requestUrl =
      `${this.baseUrl}/public/companies/` +
      `${encodeURIComponent(c)}/web-order-requests`;

    const response = await fetch(requestUrl, {
      method: "POST",
      credentials: "include", // send the session cookie so the backend knows the logged user
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(captchaToken ? { "X-Captcha-Token": captchaToken } : {}),
      },
      body: JSON.stringify(order),
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new WebOrderRequestServiceError(
        data?.message || `Error sending web order: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
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