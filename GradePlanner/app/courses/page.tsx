"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseCardSkeleton } from "@/components/shared/Skeleton";
import Toast from "@/components/shared/Toast";
import { useAuthStore } from "@/app/stores/useAuthStore";
import { useCanvasCourses } from "@/hooks/useCanvasApi";
import { ApiError } from "@/lib/api/client";
import "@/components/shared/global.css";
import "@/components/courses/course.css";

interface Course {
  id: string;
  name: string;
  courseCode: string;
  term: string;
  color: string;
}

export default function CoursesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);
  const router = useRouter();
  const { isAuthenticated, clearAuth, userName } = useAuthStore();

  // Use SWR for data fetching
  const { courses, isLoading, isError, error, refresh } = useCanvasCourses();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check authentication
    if (mounted && !isAuthenticated()) {
      router.push("/");
      return;
    }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    // Show error toast if there's an error
    if (isError && error) {
      const errorMessage =
        error instanceof ApiError ? error.message : "Failed to load courses";
      setToast({ message: errorMessage, type: "error" });
    }
  }, [isError, error]);

  const handleLogout = () => {
    clearAuth();
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
    router.push("/");
  };

  const handleViewCourse = (course: Course) => {
    // Save course name for display in dashboard
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`course_name_${course.id}`, course.name);
    }

    // Navigate to dynamic route
    router.push(`/courses/${course.id}`);
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <h1>
            Grade
            <br />
            Planner
          </h1>
          <p>Academic planning made easy</p>
          <button
            className="sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav>
          <ul className="nav-list">
            <li className="nav-item">
              <a href="/courses" className="nav-link active">
                My Courses
              </a>
            </li>
          </ul>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Account</div>
            <ul className="nav-list">
              <li className="nav-item">
                <button
                  onClick={handleLogout}
                  className="nav-link nav-link-button"
                >
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div>
            <h2>My Courses</h2>
            <div className="header-subtitle">
              Select a course to get started
            </div>
          </div>
          <div
            className="pill"
            id="tok"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {mounted && isAuthenticated() ? (
              <>
                <span style={{ fontSize: "16px" }}>👤</span>
                <span>{userName || "User"}</span>
              </>
            ) : (
              "Demo mode (no token)"
            )}
          </div>
        </header>

        <div className="grid-wrapper">
          <section className="grid" id="list">
            {!mounted || isLoading ? (
              <>
                <CourseCardSkeleton />
                <CourseCardSkeleton />
                <CourseCardSkeleton />
                <CourseCardSkeleton />
                <CourseCardSkeleton />
                <CourseCardSkeleton />
              </>
            ) : isError ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "4rem 2rem",
                  color: "#ef4444",
                }}
              >
                <p style={{ fontSize: "18px", marginBottom: "8px" }}>
                  Error loading courses
                </p>
                <p style={{ fontSize: "14px" }}>
                  {error instanceof ApiError
                    ? error.message
                    : "Failed to load courses"}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    marginTop: "16px",
                  }}
                >
                  <button
                    className="btn btn--primary"
                    onClick={() => refresh()}
                  >
                    Retry
                  </button>
                  <button
                    className="btn btn--outline"
                    onClick={() => router.push("/")}
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            ) : courses.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "4rem 2rem",
                  color: "var(--txt-muted)",
                }}
              >
                <p style={{ fontSize: "18px", marginBottom: "8px" }}>
                  No courses found
                </p>
                <p style={{ fontSize: "14px" }}>
                  {mounted && isAuthenticated()
                    ? "No active courses are available for this account."
                    : "Please enter your Canvas access token to view your courses."}
                </p>
                {mounted && !isAuthenticated() && (
                  <button
                    className="btn btn--primary"
                    style={{ marginTop: "16px" }}
                    onClick={() => router.push("/")}
                  >
                    Enter Token
                  </button>
                )}
              </div>
            ) : (
              courses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  name={course.name}
                  courseCode={course.courseCode}
                  term={course.term}
                  color={course.color}
                  onViewCourse={() => handleViewCourse(course)}
                />
              ))
            )}
          </section>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
