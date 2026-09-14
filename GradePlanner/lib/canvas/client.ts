import {
  CanvasCourse,
  CanvasAssignment,
  CanvasAssignmentGroup,
  CanvasUser,
  CanvasApiError,
  CanvasPaginationInfo,
} from "./types";

/**
 * Error from Canvas carrying its HTTP status, so routes can tell an expired
 * token from access to a single course being denied (e.g. a dropped class)
 */
export class CanvasHttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "CanvasHttpError";
  }
}

/**
 * Canvas API Client
 * Handles all API requests to Canvas LMS
 */
export class CanvasApiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  /**
   * Make authenticated request to Canvas API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; pagination?: CanvasPaginationInfo }> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${this.token}`);
    headers.set("Content-Type", "application/json");

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Parse Link header for pagination
      const pagination = this.parseLinkHeader(response.headers.get("Link"));

      if (!response.ok) {
        const errorData: CanvasApiError = await response.json().catch(() => ({
          message: response.statusText,
          status: response.status,
        }));

        throw new CanvasHttpError(
          errorData.errors?.[0]?.message ||
            errorData.message ||
            `Canvas API Error: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      return { data, pagination };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error occurred while fetching from Canvas API");
    }
  }

  /**
   * Parse Link header for pagination info
   */
  private parseLinkHeader(
    linkHeader: string | null
  ): CanvasPaginationInfo | undefined {
    if (!linkHeader) return undefined;

    const links: CanvasPaginationInfo = { current: "" };
    const parts = linkHeader.split(",");

    parts.forEach((part) => {
      const section = part.split(";");
      if (section.length !== 2) return;

      const url = section[0].replace(/<(.*)>/, "$1").trim();
      const name = section[1].replace(/rel="(.*)"/, "$1").trim();

      if (
        name === "current" ||
        name === "next" ||
        name === "prev" ||
        name === "first" ||
        name === "last"
      ) {
        links[name] = url;
      }
    });

    return links;
  }

  /**
   * Fetch every page of a list endpoint. Canvas returns 10 items per page by
   * default, so single requests silently truncate longer lists.
   */
  private async requestAll<T>(endpoint: string): Promise<T[]> {
    const separator = endpoint.includes("?") ? "&" : "?";
    let { data, pagination } = await this.request<T[]>(
      `${endpoint}${separator}per_page=100`
    );
    const all = [...data];

    while (pagination?.next) {
      // Link header URLs are absolute; request() expects a path under baseUrl
      ({ data, pagination } = await this.request<T[]>(
        pagination.next.replace(this.baseUrl, "")
      ));
      all.push(...data);
    }

    return all;
  }

  /**
   * Get all active courses for the current user
   */
  async getCourses(): Promise<CanvasCourse[]> {
    return this.requestAll<CanvasCourse>(
      "/courses?enrollment_state=active&include[]=total_students&include[]=term"
    );
  }

  /**
   * Get a specific course by ID
   */
  async getCourse(courseId: number): Promise<CanvasCourse> {
    const { data } = await this.request<CanvasCourse>(
      `/courses/${courseId}?include[]=total_students&include[]=term`
    );
    return data;
  }

  /**
   * Get assignment groups for a course
   */
  async getAssignmentGroups(
    courseId: number
  ): Promise<CanvasAssignmentGroup[]> {
    return this.requestAll<CanvasAssignmentGroup>(
      `/courses/${courseId}/assignment_groups?include[]=assignments&include[]=submission`
    );
  }

  /**
   * Get all assignments for a course
   */
  async getAssignments(courseId: number): Promise<CanvasAssignment[]> {
    return this.requestAll<CanvasAssignment>(
      `/courses/${courseId}/assignments?include[]=submission&order_by=due_at`
    );
  }

  /**
   * Get a specific assignment
   */
  async getAssignment(
    courseId: number,
    assignmentId: number
  ): Promise<CanvasAssignment> {
    const { data } = await this.request<CanvasAssignment>(
      `/courses/${courseId}/assignments/${assignmentId}?include[]=submission`
    );
    return data;
  }

  /**
   * Verify token by fetching user profile
   */
  async verifyToken(): Promise<boolean> {
    try {
      await this.request("/users/self/profile");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current user's profile
   */
  async getCurrentUser(): Promise<CanvasUser> {
    const { data } = await this.request<CanvasUser>("/users/self/profile");
    return data;
  }
}
