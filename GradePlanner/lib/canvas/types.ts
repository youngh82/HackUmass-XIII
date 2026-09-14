// Canvas API Response Types
// Based on Canvas LMS API Documentation: https://canvas.instructure.com/doc/api/

export interface CanvasApiError {
  errors?: Array<{ message: string }>;
  message?: string;
  status?: number;
}

export interface CanvasUser {
  id: number;
  name: string;
  sortable_name?: string;
  short_name?: string;
  login_id?: string;
  email?: string;
  avatar_url?: string;
  locale?: string;
  effective_locale?: string;
  time_zone?: string;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  workflow_state: "available" | "completed" | "deleted" | "unpublished";
  account_id: number;
  start_at?: string | null;
  end_at?: string | null;
  enrollment_term_id?: number;
  grading_standard_id?: number | null;
  apply_assignment_group_weights?: boolean;
  grade_passback_setting?: string | null;
  created_at?: string;
  enrollments?: CanvasEnrollment[];
  total_students?: number;
  calendar?: {
    ics: string;
  };
}

export interface CanvasEnrollment {
  type: string;
  role: string;
  role_id: number;
  user_id: number;
  enrollment_state: string;
  limit_privileges_to_course_section: boolean;
}

export interface CanvasAssignmentGroup {
  id: number;
  name: string;
  position: number;
  group_weight: number;
  sis_source_id?: string | null;
  integration_data?: Record<string, any>;
  assignments?: CanvasAssignment[];
  rules?: {
    drop_lowest?: number;
    drop_highest?: number;
    never_drop?: number[];
  };
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  due_at?: string | null;
  lock_at?: string | null;
  unlock_at?: string | null;
  has_overrides?: boolean;
  course_id: number;
  html_url: string;
  submissions_download_url?: string;
  assignment_group_id: number;
  due_date_required?: boolean;
  allowed_extensions?: string[];
  max_name_length?: number;
  turnitin_enabled?: boolean;
  vericite_enabled?: boolean;
  turnitin_settings?: Record<string, any>;
  grade_group_students_individually?: boolean;
  external_tool_tag_attributes?: Record<string, any>;
  peer_reviews?: boolean;
  automatic_peer_reviews?: boolean;
  peer_review_count?: number;
  peer_reviews_assign_at?: string | null;
  intra_group_peer_reviews?: boolean;
  group_category_id?: number | null;
  needs_grading_count?: number;
  needs_grading_count_by_section?: Array<{
    section_id: string;
    needs_grading_count: number;
  }>;
  position?: number;
  post_to_sis?: boolean;
  integration_id?: string | null;
  integration_data?: Record<string, any>;
  points_possible?: number;
  submission_types?: string[];
  has_submitted_submissions?: boolean;
  grading_type?:
    | "pass_fail"
    | "percent"
    | "letter_grade"
    | "gpa_scale"
    | "points"
    | "not_graded";
  grading_standard_id?: number | null;
  published?: boolean;
  unpublishable?: boolean;
  only_visible_to_overrides?: boolean;
  locked_for_user?: boolean;
  lock_info?: Record<string, any>;
  lock_explanation?: string;
  quiz_id?: number;
  anonymous_submissions?: boolean;
  discussion_topic?: Record<string, any>;
  freeze_on_copy?: boolean;
  frozen?: boolean;
  frozen_attributes?: string[];
  submission?: CanvasSubmission;
  use_rubric_for_grading?: boolean;
  rubric_settings?: Record<string, any>;
  rubric?: any[];
  assignment_visibility?: number[];
  overrides?: CanvasAssignmentOverride[];
  omit_from_final_grade?: boolean;
  moderated_grading?: boolean;
  grader_count?: number;
  final_grader_id?: number | null;
  grader_comments_visible_to_graders?: boolean;
  graders_anonymous_to_graders?: boolean;
  grader_names_visible_to_final_grader?: boolean;
  anonymous_grading?: boolean;
  allowed_attempts?: number;
  post_manually?: boolean;
  score_statistics?: {
    min: number;
    max: number;
    mean: number;
  };
  can_submit?: boolean;
}

export interface CanvasSubmission {
  assignment_id: number;
  assignment: CanvasAssignment;
  course: CanvasCourse;
  attempt: number;
  body?: string;
  grade?: string;
  grade_matches_current_submission?: boolean;
  html_url: string;
  preview_url: string;
  score?: number;
  submission_comments?: CanvasSubmissionComment[];
  submission_type?: string;
  submitted_at?: string | null;
  url?: string | null;
  user_id: number;
  grader_id?: number;
  graded_at?: string | null;
  user?: {
    id: number;
    display_name: string;
    avatar_image_url?: string;
    html_url: string;
  };
  late?: boolean;
  assignment_visible?: boolean;
  excused?: boolean;
  missing?: boolean;
  late_policy_status?: string | null;
  points_deducted?: number | null;
  seconds_late?: number;
  workflow_state: "submitted" | "unsubmitted" | "graded" | "pending_review";
  extra_attempts?: number | null;
  anonymous_id?: string;
  posted_at?: string | null;
  read_status?: string;
  redo_request?: boolean;
}

export interface CanvasSubmissionComment {
  id: number;
  author_id: number;
  author_name: string;
  author: {
    id: number;
    display_name: string;
    avatar_image_url?: string;
    html_url: string;
  };
  comment: string;
  created_at: string;
  edited_at?: string | null;
  media_comment?: {
    content_type: string;
    display_name: string;
    media_id: string;
    media_type: string;
    url: string;
  };
}

export interface CanvasAssignmentOverride {
  id: number;
  assignment_id: number;
  student_ids?: number[];
  group_id?: number;
  course_section_id?: number;
  title: string;
  due_at?: string | null;
  all_day?: boolean;
  all_day_date?: string | null;
  unlock_at?: string | null;
  lock_at?: string | null;
}

export interface CanvasUser {
  id: number;
  name: string;
  sortable_name?: string;
  short_name?: string;
  sis_user_id?: string | null;
  sis_import_id?: number | null;
  integration_id?: string | null;
  login_id?: string;
  avatar_url?: string;
  enrollments?: CanvasEnrollment[];
  email?: string;
  locale?: string;
  effective_locale?: string;
  last_login?: string | null;
  time_zone?: string;
  bio?: string;
}

// Pagination info from Link header
export interface CanvasPaginationInfo {
  current: string;
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
}

// Generic API Response wrapper
export interface CanvasApiResponse<T> {
  data: T;
  pagination?: CanvasPaginationInfo;
}
