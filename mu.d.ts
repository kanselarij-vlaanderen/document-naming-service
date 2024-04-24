declare module "mu" {
  import { Application, Request, Response } from "express";

  type SparqlClientResult<T extends string> = {
    head: { link: unknown[]; vars: T[] };
    results: {
      distinct: boolean;
      ordered: boolean;
      bindings: Record<
        T,
        {
          type: "literal";
          "xml:lang"?: string;
          value: SparqlClientValue;
        }
      >[];
    };
  } | null;

  type SparqlClientValue = string | number | Date | undefined;

  const app: Application;
  function sparqlEscapeString(s: string): string;
  function sparqlEscapeUri(s: string): string;
  function sparqlEscapeDecimal(n: number): string;
  function sparqlEscapeInt(n: number): string;
  function sparqlEscapeFloat(n: number): string;
  function sparqlEscapeDate(date: Date): string;
  function sparqlEscapeDateTime(date: Date): string;
  function sparqlEscapeBool(bool: boolean): string;
  function sparqlEscape(
    value: string | boolean | number | Date,
    type: string
  ): string;
  function query<T extends string>(queryString: string): Promise<SparqlClientResult<T>>;
  function update(queryString: string): Promise<null>;
  function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: () => void
  ): void;
}
