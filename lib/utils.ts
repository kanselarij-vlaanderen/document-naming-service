export function getErrorMessage(maybeError: unknown) {
  if (maybeError instanceof Error) return maybeError.message;
  else return String(maybeError);
}

export function dasherize(sentence: string): string {
  return sentence.trim().replace(/\s/g, "-");
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sparqlQueryWithRetry(sparqlMethod: Function, queryString: string, attempt = 0) {
  try {
    return await sparqlMethod(queryString);
  } catch (ex) {
    if (attempt < 5) {
      const sleepTime = 2000;
      console.log(`Query failed, sleeping ${sleepTime} ms before next attempt`);
      await sleep(sleepTime);
      return await sparqlQueryWithRetry(sparqlMethod, queryString, attempt + 1);
    } else {
      console.log(`Failed query after 5 retries: ${queryString}`);
      throw ex;
    }
  }
}