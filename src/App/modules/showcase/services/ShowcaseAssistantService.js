import { APIShao } from "../../../shared/Utils/globalVar";

export class ShowcaseAssistantServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "ShowcaseAssistantServiceError";
    this.status = status;
    this.response = response;
  }
}

/**
 * Public shopping assistant (Aleph) of a company's showcase.
 *
 * Backend route (PUBLIC, no login needed):
 *   POST /public/companies/{companyId}/assistant/ask
 *
 * The answer contains `reply` (text) and `actions` the page runs on screen
 * (add_to_cart, set_cart_quantity, open_booking, show_contact, open_cart,
 * open_login). The assistant never places orders or booking requests.
 */
export default class ShowcaseAssistantService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  async ask({ companyId, conversationId, message, visitorId, companyName, language, cart }, signal) {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      throw new TypeError("The company ID is required.");
    }

    const response = await fetch(
      `${this.baseUrl}/public/companies/${encodeURIComponent(normalizedCompanyId)}/assistant/ask`,
      {
        method: "POST",
        // Sends the session cookie when the visitor is signed in.
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          conversationId: conversationId || "",
          message,
          visitorId: visitorId || "",
          companyName: companyName || "",
          language: language || "",
          cart: (Array.isArray(cart) ? cart : [])
            .filter((line) => line?.productId && line.quantity > 0)
            .slice(0, 50)
            .map((line) => ({ productId: String(line.productId), quantity: Number(line.quantity) })),
        }),
        signal,
      },
    );

    const rawText = await response.text();
    let data = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new ShowcaseAssistantServiceError(`Invalid JSON from server (status ${response.status})`, {
          status: response.status,
        });
      }
    }

    if (!response.ok) {
      throw new ShowcaseAssistantServiceError(
        data?.message || `Assistant request failed with status ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data?.result || null;
  }
}
