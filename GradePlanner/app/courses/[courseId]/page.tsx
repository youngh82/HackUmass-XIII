"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCategoryStore } from "@/app/stores/useCategoryStore";
import { useSetupStore } from "@/app/stores/useSetupStore";
import { useAuthStore } from "@/app/stores/useAuthStore";
import { useCourseAssignments } from "@/hooks/useCanvasApi";
import { ApiError } from "@/lib/api/client";
import CategoryList from "@/components/dashboard/CategoryList";
import ProgressBar from "@/components/dashboard/ProgressBar";
import GradeStrategy from "@/components/dashboard/GradeStrategy";
import SetupModal from "@/components/setup/SetupModal";
import Toast from "@/components/shared/Toast";
import { CategorySkeleton } from "@/components/shared/Skeleton";
import "@/components/shared/global.css";
import "@/components/dashboard/dashboard.css";
import "@/components/setup/setup.css";

export default function CourseDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  const setCategories = useCategoryStore((state) => state.setCategories);
  const setSetupCategories = useSetupStore((state) => state.setSetupCategories);
  const { isAuthenticated } = useAuthStore();

  // Use SWR for data fetching
  const {
    categories,
    courseName: apiCourseName,
    isLoading,
    isError,
    error,
    refresh,
  } = useCourseAssignments(courseId);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
      return;
    }

    // Validate courseId
    if (!courseId) {
      setToast({ message: "Invalid course ID", type: "error" });
      router.push("/courses");
      return;
    }
  }, [courseId, isAuthenticated, router]);

  // Set course name from API or sessionStorage
  useEffect(() => {
    if (apiCourseName) {
      setCourseName(apiCourseName);
      sessionStorage.setItem(`course_name_${courseId}`, apiCourseName);
    } else {
      const savedCourseName = sessionStorage.getItem(`course_name_${courseId}`);
      if (savedCourseName) {
        setCourseName(savedCourseName);
      }
    }
  }, [apiCourseName, courseId]);

  // Process and store categories from SWR data
  useEffect(() => {
    if (!isLoading && categories && categories.length > 0) {
      console.log("Canvas API Response:", { categories }); // Debug log

      const formattedCategories = categories.map((cat: any, index: number) => {
        console.log("Processing category:", cat); // Debug log

        return {
          id: index + 1, // Use simple incremental ID
          name: cat.name,
          weight: cat.weight || 0,
          items:
            cat.assignments?.map((assignment: any) => {
              console.log(
                "Processing assignment:",
                assignment.name,
                assignment
              ); // Debug log

              // Convert score to percentage (score/maxScore * 100) with 1 decimal place
              // Only use score if the assignment has actually been graded
              // If earned is null, treat as ungraded (not yet taken)
              let scorePercentage = null;

              // Check if assignment.earned exists and is not null
              if (
                assignment.earned !== null &&
                assignment.earned !== undefined &&
                assignment.points > 0
              ) {
                scorePercentage = parseFloat(
                  ((assignment.earned / assignment.points) * 100).toFixed(1)
                );
              }
              // If earned is null/undefined, leave scorePercentage as null (ungraded)

              return {
                name: assignment.name,
                score: scorePercentage,
                maxScore: assignment.points || 0,
                dueDate: assignment.dueDate,
                submitted: assignment.submitted || false,
                graded: assignment.graded || false,
                late: assignment.late || false,
                missing: assignment.missing || false,
              };
            }) || [],
          editingName: false,
          editingWeight: false,
          showItems: true,
        };
      });

      console.log("Formatted categories:", formattedCategories); // Debug log
      setCategories(formattedCategories);
      
      // Also sync to setupCategories for syllabus merge
      const setupCategoriesData = categories.map((cat: any, index: number) => ({
        id: index + 1,
        name: cat.name,
        weight: cat.weight || 0,
        count: cat.assignments?.length || 0,
      }));
      console.log("Setup categories synced:", setupCategoriesData); // Debug log
      setSetupCategories(setupCategoriesData);
      
      setToast({
        message: "Course data loaded successfully!",
        type: "success",
      });
    } else if (!isLoading && categories && categories.length === 0) {
      console.log("No categories found in response");
      setToast({
        message: "No assignment categories found for this course",
        type: "warning",
      });
    }
  }, [categories, isLoading, setCategories, setSetupCategories]);

  // Show error toast
  useEffect(() => {
    if (isError && error) {
      console.error("Failed to fetch course data:", error);
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : "Failed to load course data";
      setToast({ message: errorMessage, type: "error" });
    }
  }, [isError, error]);

  // Open setup modal on first visit to this course
  useEffect(() => {
    if (!isLoading && mounted) {
      const hasVisited = localStorage.getItem(`course_visited_${courseId}`);
      if (!hasVisited) {
        setIsSetupModalOpen(true);
        localStorage.setItem(`course_visited_${courseId}`, "true");
      }
    }
  }, [isLoading, mounted, courseId]);

  const handleBackToCourses = () => {
    router.push("/courses");
  };

  const handleRefreshData = () => {
    refresh();
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
              <button
                onClick={handleBackToCourses}
                className="nav-link nav-link-button"
              >
                ← Back to Courses
              </button>
            </li>
          </ul>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Course Tools</div>
            <ul className="nav-list">
              <li className="nav-item">
                <button
                  onClick={() => setIsSetupModalOpen(true)}
                  className="nav-link nav-link-button"
                >
                  Setup Course Data
                </button>
              </li>
            </ul>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Data</div>
            <ul className="nav-list">
              <li className="nav-item">
                <button
                  onClick={handleRefreshData}
                  className="nav-link nav-link-button"
                >
                  Refresh Data
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
      <div className="main-content">
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
            <div className="header-subtitle">Current Course</div>
            <h2 id="course">{courseName || "Loading..."}</h2>
          </div>
        </header>

        {!mounted || isLoading ? (
          <div style={{ padding: "2rem" }}>
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
          </div>
        ) : isError ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              color: "#ef4444",
            }}
          >
            <p style={{ fontSize: "18px", marginBottom: "8px" }}>
              Error loading course
            </p>
            <p style={{ fontSize: "14px" }}>
              {error instanceof ApiError
                ? error.message
                : "Failed to load course data"}
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                marginTop: "16px",
              }}
            >
              <button className="btn btn--primary" onClick={handleRefreshData}>
                Retry
              </button>
              <button
                className="btn btn--outline"
                onClick={handleBackToCourses}
              >
                Back to Courses
              </button>
            </div>
          </div>
        ) : (
          <div className="wrap">
            {/* Setup Modal */}
            <SetupModal
              isOpen={isSetupModalOpen}
              onClose={() => setIsSetupModalOpen(false)}
            />

            {/* Progress Bar */}
            <ProgressBar />

            {/* Grade Strategy */}
            <GradeStrategy />

            {/* Categories */}
            <div className="card">
              <CategoryList />
            </div>
          </div>
        )}
      </div>

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
