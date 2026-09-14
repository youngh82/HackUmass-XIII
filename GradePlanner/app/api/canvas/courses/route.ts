import { NextRequest, NextResponse } from "next/server";
import { CanvasApiClient, CanvasHttpError } from "@/lib/canvas/client";
import { mapCanvasCourse } from "@/lib/canvas/mapper";

// GET /api/canvas/courses
// Fetches list of active courses from Canvas
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("x-canvas-token");
    const baseUrl = request.headers.get("x-canvas-base-url");

    if (!token || !baseUrl) {
      return NextResponse.json(
        { error: "Token and baseUrl are required" },
        { status: 400 }
      );
    }

    // Create Canvas API client
    const client = new CanvasApiClient(baseUrl, token);

    // Fetch courses
    const canvasCourses = await client.getCourses();

    // Map to app format
    const courses = canvasCourses
      .filter((course) => course.workflow_state === "available")
      .map(mapCanvasCourse);

    return NextResponse.json({ courses });
  } catch (error) {
    // Listing the user's own courses only fails with 401 when the token is
    // bad, so pass it through and let the client log out
    if (error instanceof CanvasHttpError && error.status === 401) {
      return NextResponse.json(
        { error: "Canvas token is invalid or expired" },
        { status: 401 }
      );
    }

    console.error("Courses fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch courses",
      },
      { status: 500 }
    );
  }
}
