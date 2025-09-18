export function getErrorMessage(maybeError: unknown) {
  if (maybeError instanceof Error) return maybeError.message;
  else return String(maybeError);
}
