"use node";

/**
 * Error handling utilities for Convex functions.
 * Provides consistent error types and response formats.
 */

// Error categories for classification
export type ErrorCategory =
  | "AUTH"
  | "RATE_LIMIT"
  | "NETWORK"
  | "VALIDATION"
  | "CRYPTO"
  | "NOT_FOUND"
  | "GITHUB_API"
  | "DATABASE"
  | "UNKNOWN";

// Standardized error response format
export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    category: ErrorCategory;
    details?: string;
  };
}

// Create a success result
export function success<T>(data?: T): ActionResult<T> {
  return { success: true, data };
}

// Create an error result
export function failure(
  message: string,
  category: ErrorCategory = "UNKNOWN",
  details?: string
): ActionResult<never> {
  return {
    success: false,
    error: { message, category, details },
  };
}

// GitHub API specific error handling
export function handleGitHubError(status: number, context: string): ActionResult<never> {
  switch (status) {
    case 401:
      return failure("GitHub authentication failed. Token may be invalid or expired.", "AUTH");
    case 403:
      return failure("GitHub rate limit exceeded or access forbidden.", "RATE_LIMIT");
    case 404:
      return failure(`Resource not found: ${context}`, "NOT_FOUND");
    case 422:
      return failure("Invalid request to GitHub API.", "VALIDATION");
    case 429:
      return failure("GitHub API rate limit exceeded. Please try again later.", "RATE_LIMIT");
    default:
      return failure(`GitHub API error (${status})`, "GITHUB_API");
  }
}

// Extract error message from unknown error
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

// Log error with context (for debugging)
export function logError(context: string, error: unknown, metadata?: Record<string, unknown>): void {
  const message = getErrorMessage(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${context}] ${message}`, {
    ...metadata,
    stack,
    timestamp: new Date().toISOString(),
  });
}
