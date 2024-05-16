export function getErrorMessage(maybeError: unknown) {
  if (maybeError instanceof Error) return maybeError.message;
  else return String(maybeError);
}

export function dasherize(sentence: string): string {
  return sentence.trim().replace(/\s/g, "-");
}
