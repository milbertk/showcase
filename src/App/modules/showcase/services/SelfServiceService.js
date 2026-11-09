import { APIShao } from "../../../shared/Utils/globalVar";

export class SelfServiceError extends Error {
  constructor(message, { status, code, response } = {}) {
    super(message);
    this.name = "SelfServiceError";
    this.status = status;
    this.code = code;
    this.response = response;
  }
}

/**
 * Customer "manage my request" link (public, the token is the key).
 *
 *   GET  /public/self-service/{token}
 *   POST /public/self-service/{token}/cancel-request  { reason }  (email to the business; manual cancel)
 *   POST /public/self-service/{token}/reschedule  { appointmentDate, startHour, endHour, locationId }
 */
export default class SelfServiceService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  url(token, suffix = "") {
    const value = String(token || "").trim();
    if (!value) throw new TypeError("The link token is required.");
    return `${this.baseUrl}/public/self-service/${encodeURIComponent(value)}${suffix}`;
  }

  async request(url, { method = "GET", body, signal } = {}) {
    let response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (cause) {
      if (cause?.name === "AbortError") throw cause;
      throw new SelfServiceError("The server could not be reached.", { status: 0, code: "NETWORK" });
    }

    const data = await readResponse(response);
    if (!response.ok) {
      throw new SelfServiceError(data?.message || `Request failed: ${response.status}`, {
        status: response.status,
        code: data?.result?.code || "",
        response: data,
      });
    }
    return data?.result || null;
  }

  view({ token, signal } = {}) {
    return this.request(this.url(token), { signal });
  }

  requestCancel({ token, reason = "" } = {}) {
    return this.request(this.url(token, "/cancel-request"), { method: "POST", body: { reason } });
  }

  reschedule({ token, appointmentDate, startHour, endHour, locationId = "" } = {}) {
    return this.request(this.url(token, "/reschedule"), {
      method: "POST",
      // locationId (2026-11-07): location of the new time ("" = none).
      body: { appointmentDate, startHour, endHour, locationId },
    });
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
