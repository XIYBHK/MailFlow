export class AppError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleError(error: unknown): string {
  if (error instanceof Error) {
    console.error(error)
    return error.message
  }
  console.error(error)
  return String(error)
}

export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error)
}
