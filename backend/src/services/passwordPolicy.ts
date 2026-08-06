export const PASSWORD_POLICY = {
  minimumLength: 8,
  maximumUtf8Bytes: 1024,
} as const;

/**
 * Passwords are capped at 1,024 UTF-8 bytes before hashing. This keeps the
 * hashing boundary finite while supporting long passphrases and Unicode.
 * Valid passwords are returned exactly as supplied and are never truncated.
 */
export const PASSWORD_VALIDATION_MESSAGE =
  "Password must be at least 8 characters and no more than 1024 bytes when encoded as UTF-8.";

type PasswordValidationOptions = {
  optional?: boolean;
};

type PasswordValidationFailure = {
  ok: false;
  message: typeof PASSWORD_VALIDATION_MESSAGE;
};

export type RequiredPasswordValidationResult =
  | { ok: true; password: string }
  | PasswordValidationFailure;

export type OptionalPasswordValidationResult =
  | { ok: true; password: string | undefined }
  | PasswordValidationFailure;

export function validatePasswordInput(
  value: unknown,
): RequiredPasswordValidationResult;
export function validatePasswordInput(
  value: unknown,
  options: { optional: true },
): OptionalPasswordValidationResult;

export function validatePasswordInput(
  value: unknown,
  options: PasswordValidationOptions = {},
): OptionalPasswordValidationResult {
  if (options.optional && (value === undefined || value === "")) {
    return { ok: true, password: undefined };
  }

  if (typeof value !== "string") {
    return { ok: false, message: PASSWORD_VALIDATION_MESSAGE };
  }

  if (
    value.length < PASSWORD_POLICY.minimumLength ||
    Buffer.byteLength(value, "utf8") > PASSWORD_POLICY.maximumUtf8Bytes
  ) {
    return { ok: false, message: PASSWORD_VALIDATION_MESSAGE };
  }

  return { ok: true, password: value };
}
