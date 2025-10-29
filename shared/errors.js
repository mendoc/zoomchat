export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ExtractionError extends AppError {
  constructor(message) {
    super(message, 500);
  }
}

export class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500);
  }
}

export class TelegramError extends AppError {
  constructor(message) {
    super(message, 500);
  }
}
