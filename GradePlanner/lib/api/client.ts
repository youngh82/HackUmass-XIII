import { useAuthStore } from "@/app/stores/useAuthStore";

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private static getHeaders(): HeadersInit {
    const { token, baseUrl } = useAuthStore.getState();

    if (!token || !baseUrl) {
      throw new ApiError("Not authenticated", 401);
    }

    return {
      "x-canvas-token": token,
      "x-canvas-base-url": baseUrl,
      "Content-Type": "application/json",
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    // 401: Token expired or invalid
    if (response.status === 401) {
      const { clearAuth } = useAuthStore.getState();
      clearAuth();
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        window.location.href = "/";
      }
      throw new ApiError("Session expired. Please login again.", 401);
    }

    // 403: Forbidden
    if (response.status === 403) {
      // Prefer the server's explanation (e.g. a dropped course)
      const body = await response.json().catch(() => null);
      throw new ApiError(
        body?.error || "You don't have permission to access this resource.",
        403
      );
    }

    // 404: Not Found
    if (response.status === 404) {
      throw new ApiError("Resource not found.", 404);
    }

    // 429: Rate Limit
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new ApiError(
        `Rate limit exceeded. Please try again ${
          retryAfter ? `after ${retryAfter} seconds` : "later"
        }.`,
        429
      );
    }

    // 500+: Server Error
    if (response.status >= 500) {
      throw new ApiError(
        "Server error. Please try again later.",
        response.status
      );
    }

    // Other errors
    if (!response.ok) {
      let errorMessage = "Request failed";
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } catch {
        // Failed to parse error response
      }
      throw new ApiError(errorMessage, response.status);
    }

    // Success
    try {
      return await response.json();
    } catch {
      // Empty response body
      return {} as T;
    }
  }

  static async get<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: this.getHeaders(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new ApiError("Network error. Please check your connection.", 0);
      }
      throw new ApiError("An unexpected error occurred.", 0);
    }
  }

  static async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new ApiError("Network error. Please check your connection.", 0);
      }
      throw new ApiError("An unexpected error occurred.", 0);
    }
  }

  static async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new ApiError("Network error. Please check your connection.", 0);
      }
      throw new ApiError("An unexpected error occurred.", 0);
    }
  }

  static async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new ApiError("Network error. Please check your connection.", 0);
      }
      throw new ApiError("An unexpected error occurred.", 0);
    }
  }
}
