/** Error type carrying an HTTP status and an optional field-error map. */
export class ApiError extends Error {
  constructor(status, message, { errors = null, code = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

export const badRequest = (message, errors) => new ApiError(400, message, { errors });
export const unauthorized = (message = 'Authentication required.') => new ApiError(401, message);
export const forbidden = (message = 'You do not have permission to do this.') =>
  new ApiError(403, message);
export const notFound = (message = 'Not found.') => new ApiError(404, message);
export const conflict = (message, code = null) => new ApiError(409, message, { code });
export const unprocessable = (message, errors, code) =>
  new ApiError(422, message, { errors, code });
export const serviceUnavailable = (message) =>
  new ApiError(503, message, { code: 'SERVICE_UNAVAILABLE' });

/**
 * Wraps an async route handler so rejected promises reach the central error
 * middleware (Express 5 does this natively, but this keeps intent explicit).
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
