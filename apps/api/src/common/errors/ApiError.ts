export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Array<{ field?: string; message: string }>;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: Array<{ field?: string; message: string }>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
