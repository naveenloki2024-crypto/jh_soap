import { ApiError } from './http.js';

const DUPLICATE_KEY = 11000;

export function isDuplicateKeyError(error) {
  return Boolean(error && (error.code === DUPLICATE_KEY || error.code === '11000'));
}

/**
 * Converts driver and Mongoose errors into safe API errors. Raw Mongo error
 * payloads (which may contain document values) are never returned to clients.
 */
export function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (error?.type === 'entity.parse.failed') {
    return new ApiError(400, 'Request body must contain valid JSON.', { code: 'INVALID_JSON' });
  }

  if (error?.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large.', { code: 'PAYLOAD_TOO_LARGE' });
  }

  if (isDuplicateKeyError(error)) {
    const fields = Object.keys(error.keyPattern || error.keyValue || {});
    const field = fields[0] || 'value';
    return new ApiError(409, 'A record with that value already exists.', {
      code: 'DUPLICATE_KEY',
      errors: { [field]: 'This value is already in use.' },
    });
  }

  if (error?.name === 'ValidationError' && error.errors) {
    const errors = {};
    for (const [path, detail] of Object.entries(error.errors)) {
      if (path === 'payload' || path === '_id') continue;
      errors[path] = detail.message;
    }
    return new ApiError(400, 'Validation failed.', { errors, code: 'VALIDATION_ERROR' });
  }

  if (error?.name === 'CastError') {
    return new ApiError(400, 'Invalid identifier or value.', {
      code: 'INVALID_VALUE',
      errors: { [error.path]: 'Invalid value.' },
    });
  }

  if (
    error?.name === 'MongoServerSelectionError' ||
    error?.name === 'MongoNetworkError' ||
    error?.name === 'MongooseServerSelectionError' ||
    error?.name === 'MongoTimeoutError'
  ) {
    return new ApiError(503, 'Database is temporarily unavailable. Please try again.', {
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  if (error?.name === 'DocumentNotFoundError') {
    return new ApiError(404, 'Not found.', { code: 'NOT_FOUND' });
  }

  return new ApiError(500, 'Internal server error.', { code: 'INTERNAL_ERROR' });
}
