import { toast } from "@/hooks/use-toast";

// Error codes from the backend
export enum ErrorCode {
  BAD_REQUEST = "Bad Request",
  PERMISSION_DENIED = "Permission denied",
  METHOD_NOT_ALLOWED = "Method not allowed",
  TIMEOUT = "Timeout",
  VALIDATION_ERROR = "Validation error",
  REQUEST_VALIDATION_ERROR = "Request validation error",
  INTERNAL_SERVER_ERROR = "Internal server error",
  EXTERNAL_API_ERROR = "External API error",
  API_REQUEST_EXCEPTION = "API Request exception",
  RATE_LIMIT_EXCEEDED = "Rate limit exceeded",
  DB_CONNECTION_NOT_FOUND = "Database connection not found",
  UNKNOWN_ERROR = "Unknown error",
}

export enum ResponseCode {
  BAD_REQUEST = 400,
  PERMISSION_DENIED = 403,
  METHOD_NOT_ALLOWED = 405,
  TIMEOUT = 408,
  VALIDATION_ERROR = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

interface ErrorDetails {
  title: string;
  description: string;
  actionable?: boolean;
}

/**
 * Maps backend error messages and status codes to user-friendly error messages
 */
function getErrorDetails(error: any): ErrorDetails {
  const errorMessage = error.message || error.toString();
  const statusMatch = errorMessage.match(/(\d{3})/); // Extract status code
  const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;

  // Try to parse JSON error details from Nova backend errors
  let errorDetail = null;
  let validationErrors = null;
  try {
    const jsonMatch = errorMessage.match(/\{.*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      errorDetail = parsed.detail || parsed.message;
      
      // Handle Nova backend validation errors specifically
      if (parsed.detail && parsed.detail.error_code === 'REQUEST_VALIDATION_ERROR') {
        try {
          // Parse the errors string which contains Python-style validation errors
          const errorsString = parsed.detail.errors;
          if (errorsString) {
            // Extract user-friendly validation messages
            const reasonMatch = errorsString.match(/'reason': '([^']+)'/);
            const msgMatch = errorsString.match(/'msg': '([^']+)'/);
            const locMatch = errorsString.match(/'loc': \([^,]+, '([^']+)'\)/);
            
            if (reasonMatch && reasonMatch[1]) {
              validationErrors = reasonMatch[1];
            } else if (msgMatch && msgMatch[1]) {
              // Extract the user-friendly part after the colon
              const msg = msgMatch[1];
              const colonIndex = msg.indexOf(':');
              validationErrors = colonIndex > -1 ? msg.substring(colonIndex + 1).trim() : msg;
            }
            
            // Add field context if available
            if (locMatch && locMatch[1] && validationErrors) {
              const fieldName = locMatch[1].charAt(0).toUpperCase() + locMatch[1].slice(1);
              validationErrors = `${fieldName}: ${validationErrors}`;
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse validation errors:', parseError);
        }
      }
    }
  } catch {
    // Check if error is a fetch response with Nova error structure
    if (error && typeof error === 'object' && error.detail) {
      errorDetail = error.detail.message || error.detail;
      
      // Handle direct Nova validation error objects
      if (error.detail.error_code === 'REQUEST_VALIDATION_ERROR') {
        try {
          const errorsString = error.detail.errors;
          if (errorsString) {
            const reasonMatch = errorsString.match(/'reason': '([^']+)'/);
            const msgMatch = errorsString.match(/'msg': '([^']+)'/);
            const locMatch = errorsString.match(/'loc': \([^,]+, '([^']+)'\)/);
            
            if (reasonMatch && reasonMatch[1]) {
              validationErrors = reasonMatch[1];
            } else if (msgMatch && msgMatch[1]) {
              const msg = msgMatch[1];
              const colonIndex = msg.indexOf(':');
              validationErrors = colonIndex > -1 ? msg.substring(colonIndex + 1).trim() : msg;
            }
            
            if (locMatch && locMatch[1] && validationErrors) {
              const fieldName = locMatch[1].charAt(0).toUpperCase() + locMatch[1].slice(1);
              validationErrors = `${fieldName}: ${validationErrors}`;
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse direct validation errors:', parseError);
        }
      }
    }
  }

  // Handle specific error cases
  switch (statusCode) {
    case ResponseCode.PERMISSION_DENIED:
      if (errorDetail?.includes('organisation permissions') || 
          errorDetail?.includes('organization permissions') ||
          errorMessage.includes('insufficient organisation permissions')) {
        return {
          title: "🛡️ Insufficient Permissions",
          description: "You don't have the required permissions to perform this action. Please contact your organization administrator.",
          actionable: true,
        };
      }
      if (errorDetail?.includes('application permissions') || 
          errorDetail?.includes('Insufficient application permissions')) {
        return {
          title: "🛡️ Insufficient Permissions",
          description: "You don't have the required permissions to perform this action in this application. Please contact an application administrator.",
          actionable: true,
        };
      }
      return {
        title: "🚫 Access Denied",
        description: "You don't have permission to access this resource.",
        actionable: false,
      };

    case ResponseCode.BAD_REQUEST:
      if (validationErrors) {
        return {
          title: "⚠️ Invalid Input",
          description: validationErrors,
          actionable: true,
        };
      }
      if (errorDetail?.includes('validation') || errorMessage.includes('validation')) {
        return {
          title: "⚠️ Invalid Input",
          description: errorDetail || "Please check your input and try again.",
          actionable: true,
        };
      }
      return {
        title: "⚠️ Bad Request",
        description: errorDetail || "The request was invalid. Please check your input.",
        actionable: true,
      };

    case ResponseCode.METHOD_NOT_ALLOWED:
      return {
        title: "🚫 Method Not Allowed",
        description: "This action is not supported.",
        actionable: false,
      };

    case ResponseCode.TIMEOUT:
      return {
        title: "⏱️ Request Timeout",
        description: "The request took too long to complete. Please try again.",
        actionable: true,
      };

    case ResponseCode.VALIDATION_ERROR:
      if (validationErrors) {
        return {
          title: "📝 Validation Error",
          description: validationErrors,
          actionable: true,
        };
      }
      return {
        title: "📝 Validation Error",
        description: errorDetail || "Please check your input and correct any errors.",
        actionable: true,
      };

    case ResponseCode.TOO_MANY_REQUESTS:
      return {
        title: "🚦 Rate Limit Exceeded",
        description: "Too many requests. Please wait a moment before trying again.",
        actionable: true,
      };

    case ResponseCode.INTERNAL_SERVER_ERROR:
      return {
        title: "🔧 Server Error",
        description: "Something went wrong on our end. Please try again later.",
        actionable: true,
      };

    default:
      // Handle Nova validation errors that might not have the expected status code
      if (validationErrors) {
        return {
          title: "📝 Validation Error",
          description: validationErrors,
          actionable: true,
        };
      }
      
      // Handle specific error messages without status codes
      if (errorMessage.includes('rate limit') || errorMessage.includes('Rate limit')) {
        return {
          title: "🚦 Rate Limit Exceeded",
          description: "Too many requests. Please wait a moment before trying again.",
          actionable: true,
        };
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        return {
          title: "⏱️ Request Timeout",
          description: "The request took too long to complete. Please try again.",
          actionable: true,
        };
      }

      if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        return {
          title: "🌐 Network Error",
          description: "Please check your internet connection and try again.",
          actionable: true,
        };
      }

      // Default unknown error
      return {
        title: "❌ Unknown Error",
        description: errorDetail || errorMessage || "An unexpected error occurred. Please try again.",
        actionable: true,
      };
  }
}

/**
 * Centralized error handler that displays user-friendly toast messages
 * @param error - The error object or message
 * @param context - Optional context for better error messages (e.g., "inviting user", "loading data")
 */
export function handleError(error: any, context?: string) {
  const errorDetails = getErrorDetails(error);
  
  let description = errorDetails.description;
  if (context && errorDetails.actionable) {
    description = `Failed to ${context}. ${description}`;
  }

  toast({
    variant: "destructive",
    title: errorDetails.title,
    description,
  });
}

/**
 * Success toast helper for consistent success messaging
 */
export function showSuccess(title: string, description?: string) {
  toast({
    title: `✅ ${title}`,
    description,
  });
}

/**
 * Info toast helper for informational messages
 */
export function showInfo(title: string, description?: string) {
  toast({
    title: `ℹ️ ${title}`,
    description,
  });
}
