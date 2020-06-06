export type IValidationResult<T> = { valid: false; details: string } | { valid: true; obj: T };
