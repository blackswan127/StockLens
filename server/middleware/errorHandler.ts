import type { Request, Response, NextFunction } from 'express';

const GENERIC_ERROR_MESSAGE = 'An unexpected internal server error occurred.';
const DEFAULT_CLIENT_ERROR_MESSAGE = 'The request could not be completed.';
const MAX_CLIENT_MESSAGE_LENGTH = 240;
const MAX_DETAIL_LENGTH = 1000;

type ErrorLike = {
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
  response?: { status?: unknown } | null;
};

type ErrorResponseBody = {
  error: true;
  status: number;
  message: string;
  type: 'API_RATE_LIMIT' | 'SERVER_ERROR';
  detail?: string;
};

const asErrorLike = (err: unknown): ErrorLike => {
  if (typeof err === 'object' && err !== null) {
    return err as ErrorLike;
  }
  return {};
};

const stripControlCharacters = (value: string): string =>
  Array.from(value, (char) => {
    const code = char.codePointAt(0) ?? 0;
    return code < 0x20 || code === 0x7f ? ' ' : char;
  }).join('');

const sanitizeMessage = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const cleaned = stripControlCharacters(value).replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return fallback;
  }

  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3)}...` : cleaned;
};

const deriveStatus = (err: unknown): number => {
  const error = asErrorLike(err);
  const responseStatus =
    typeof error.response === 'object' && error.response !== null
      ? error.response.status
      : undefined;

  const raw = error.status || error.statusCode || responseStatus || 500;
  const numeric = typeof raw === 'number' ? raw : Number(raw);

  if (!Number.isFinite(numeric)) {
    return 500;
  }

  return Math.min(599, Math.max(400, Math.trunc(numeric)));
};

const deriveDetail = (error: ErrorLike): string | undefined => {
  if (typeof error.message !== 'string') {
    return undefined;
  }

  const detail = error.message.trim();
  if (!detail) {
    return undefined;
  }

  return detail.length > MAX_DETAIL_LENGTH ? `${detail.slice(0, MAX_DETAIL_LENGTH)}...` : detail;
};

const logError = (req: Request, err: unknown): void => {
  if (req.log?.error) {
    req.log.error({ err }, 'Unhandled express route error');
    return;
  }

  console.error('[EXPRESS ROUTE ERROR]', err);
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logError(req, err);

  const error = asErrorLike(err);
  const status = deriveStatus(err);
  const isServerError = status >= 500;

  const body: ErrorResponseBody = {
    error: true,
    status,
    message: isServerError
      ? GENERIC_ERROR_MESSAGE
      : sanitizeMessage(error.message, DEFAULT_CLIENT_ERROR_MESSAGE, MAX_CLIENT_MESSAGE_LENGTH),
    type: status === 429 ? 'API_RATE_LIMIT' : 'SERVER_ERROR',
  };

  if (isServerError && process.env.NODE_ENV !== 'production') {
    const detail = deriveDetail(error);
    if (detail) {
      body.detail = detail;
    }
  }

  res.status(status).json(body);
};
