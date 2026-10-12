import { APIShao } from "../../../shared/Utils/globalVar";


export class AppointmentRequestServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "AppointmentRequestServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class AppointmentRequestService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Sends a guest appointment request from the public showcase.
   *
   * Backend route (public, no auth):
   * POST /public/companies/{companyId}/appointment-requests
   *
   * @param {object} params
   * @param {string} params.companyId
   * @param {object} params.request  {
   *   serviceId, customerName, phone, email, socialLink,
   *   appointmentDate, startHour, endHour, comments }
   */
  async createRequest({ companyId, request, signal } = {}) {
    const c = String(companyId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!request || typeof request !== "object") {
      throw new TypeError("The request object is required.");
    }

    const requestUrl =
      `${this.baseUrl}/public/companies/` +
      `${encodeURIComponent(c)}/appointment-requests`;

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new AppointmentRequestServiceError(
        data?.message || `Error sending request: ${response.status}`,
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
