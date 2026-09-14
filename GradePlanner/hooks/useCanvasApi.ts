"use client";

import useSWR from "swr";
import { ApiClient } from "@/lib/api/client";
import { useAuthStore } from "@/app/stores/useAuthStore";

interface Course {
  id: string;
  name: string;
  courseCode: string;
  term: string;
  color: string;
}

interface CoursesResponse {
  courses: Course[];
}

interface AssignmentsResponse {
  categories: any[];
  courseName?: string;
}

interface AssignmentGroupsResponse {
  assignmentGroups: any[];
}

// SWR fetcher using ApiClient
const fetcher = <T>(url: string): Promise<T> => ApiClient.get<T>(url);

/**
 * Hook to fetch courses with SWR caching
 */
export function useCanvasCourses() {
  const { isAuthenticated } = useAuthStore();

  const { data, error, isLoading, mutate } = useSWR<CoursesResponse>(
    isAuthenticated() ? "/api/canvas/courses" : null,
    (url: string) => fetcher<CoursesResponse>(url),
    {
      revalidateOnFocus: false, // Don't revalidate on tab focus
      revalidateOnReconnect: true, // Revalidate on network reconnect
      dedupingInterval: 60000, // Dedupe requests within 1 minute
      errorRetryCount: 3, // Retry failed requests 3 times
      errorRetryInterval: 5000, // Wait 5 seconds between retries
    }
  );

  return {
    courses: data?.courses || [],
    isLoading,
    isError: error,
    error,
    refresh: mutate,
  };
}

/**
 * Hook to fetch course assignments with SWR caching
 */
export function useCourseAssignments(courseId: string | null) {
  const { isAuthenticated } = useAuthStore();

  const { data, error, isLoading, mutate } = useSWR<AssignmentsResponse>(
    isAuthenticated() && courseId
      ? `/api/canvas/assignments/${courseId}`
      : null,
    (url: string) => fetcher<AssignmentsResponse>(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Reduced to 5 seconds for faster updates during development
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  return {
    categories: data?.categories || [],
    courseName: data?.courseName,
    isLoading,
    isLoaded: data !== undefined,
    isError: error,
    error,
    refresh: mutate,
  };
}

/**
 * Hook to fetch assignment groups with SWR caching
 */
export function useCourseAssignmentGroups(courseId: string | null) {
  const { isAuthenticated } = useAuthStore();

  const { data, error, isLoading, mutate } = useSWR<AssignmentGroupsResponse>(
    isAuthenticated() && courseId
      ? `/api/canvas/assignment-groups/${courseId}`
      : null,
    (url: string) => fetcher<AssignmentGroupsResponse>(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 120000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  return {
    assignmentGroups:
      (data as AssignmentGroupsResponse | undefined)?.assignmentGroups || [],
    isLoading,
    isError: error,
    error,
    refresh: mutate,
  };
}
