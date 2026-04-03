export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
}

export const BadRequestError = (msg) => new HttpError(400, msg);
export const UnauthorizedError = (msg) => new HttpError(401, msg);
export const ForbiddenError = (msg) => new HttpError(403, msg);
export const NotFoundError = (msg) => new HttpError(404, msg);
