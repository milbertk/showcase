import { APIUsers } from "../../../shared/Utils/globalVar";

// Talks to the SAME user-app backend (APIUsers) as the main system.
// The backend sets an HttpOnly cookie on /login, so we use credentials: include.
export default class ShowcaseLoginService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  // POST /login with the Firebase ID token -> backend sets the session cookie.
  async login(firebaseToken) {
    if (!firebaseToken) throw new Error("Missing Firebase token");

    const response = await fetch(`${this.baseUrl}/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data?.message || `Login failed (${response.status})`);
    }
    return data;
  }

  // GET /getuserinfo -> returns the current session user (or 401 if none).
  // Returns the flattened user object, or null when there is no valid session.
  async getCurrentUser() {
    let response;
    try {
      response = await fetch(`${this.baseUrl}/getuserinfo`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      return null; // network error -> treat as no session
    }

    if (response.status === 401) return null;

    const data = await readJson(response);
    if (!response.ok || !data || !data.user) return null;
    if (data.inactive) return null; // account exists but not usable

    return {
      ...data.user,
      authenticated: true,
      emailVerified: !!data.email_verified,
    };
  }

  // POST /logout -> backend clears the HttpOnly session cookie.
  async logout() {
    try {
      await fetch(`${this.baseUrl}/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      // best-effort; ignore network errors on logout
    }
  }

  // GET /createuser with the Firebase ID token -> creates the local user.
  async createUser(firebaseToken) {
    if (!firebaseToken) throw new Error("Missing Firebase token");

    const response = await fetch(`${this.baseUrl}/createuser`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data?.message || `Create user failed (${response.status})`);
    }
    return data;
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}