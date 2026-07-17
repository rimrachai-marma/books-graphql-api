export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Record<string, string[]>;

  constructor(
    statusCode: number,
    message: string,
    options?: {
      isOperational?: boolean;
      errors?: Record<string, string[]>;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = options?.isOperational ?? true;
    this.errors = options?.errors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
