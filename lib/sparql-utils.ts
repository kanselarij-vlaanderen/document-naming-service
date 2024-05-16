import { sparqlEscapeUri, SparqlClientResponse, SparqlClientValue } from "mu";

/**
 * Configuration for reshaping sparql result data.
 */
type ResourceReshape = {
  kind: "resource";
  idProp: string;
  destIdProp?: string;
  propShapers?: {
    [propName: string]: ResourceReshape | LiteralReshape;
  };
};

type LiteralReshape = {
  kind: "literal";
  method?: "takeOne" | "collect";
  sourceProp?: string;
};

const prefixes = {
  adms: "http://www.w3.org/ns/adms#",
  besluit: "http://data.vlaanderen.be/ns/besluit#",
  besluitvorming: "https://data.vlaanderen.be/ns/besluitvorming#",
  cogs: "http://vocab.deri.ie/cogs#",
  dbpedia: "http://dbpedia.org/ontology/",
  dct: "http://purl.org/dc/terms/",
  dossier: "https://data.vlaanderen.be/ns/dossier#",
  ext: "http://mu.semte.ch/vocabularies/ext/",
  mu: "http://mu.semte.ch/vocabularies/core/",
  nfo: "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#",
  nie: "http://www.semanticdesktop.org/ontologies/2007/01/19/nie#",
  nmo: "http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#",
  parl: "http://mu.semte.ch/vocabularies/ext/parlement/",
  pav: "http://purl.org/pav/",
  prov: "http://www.w3.org/ns/prov#",
  schema: "http://schema.org/",
  sign: "http://mu.semte.ch/vocabularies/ext/handtekenen/",
  skos: "http://www.w3.org/2004/02/skos/core#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  generiek: "https://data.vlaanderen.be/ns/generiek#",
};

const prefixHeaderLines = Object.fromEntries(
  Object.entries(prefixes).map(([key, value]) => [
    key,
    `PREFIX ${key}: ${sparqlEscapeUri(value)}`,
  ])
) as typeof prefixes;

const exampleConfig: ResourceReshape = {
  kind: "resource",
  idProp: "uri",
  propShapers: {
    title: { kind: "literal" },
    shortTitle: { kind: "literal" },
    pieces: {
      kind: "resource",
      idProp: "pieceUri",
      destIdProp: "uri",
      propShapers: {
        name: { kind: "literal", sourceProp: "pieceName" },
        created: { kind: "literal", sourceProp: "pieceCreated" },
      },
    },
  },
};

class SparqlValue {
  value: SparqlClientValue;
  constructor(value: SparqlClientValue) {
    this.value = value;
  }

  asString(): string {
    if (typeof this.value !== "string") {
      throw new Error("Given value is not a string");
    }
    return this.value;
  }
  asNumber(): number {
    if (typeof this.value !== "number") {
      throw new Error("Given value is not a number");
    }
    return this.value;
  }

  asDate(): Date {
    if (!(this.value instanceof Date)) {
      throw new Error("Given value is not a date");
    }
    return this.value;
  }

  asBoolean(): boolean {
    if (!["number", "boolean"].includes(typeof this.value)) {
      // We allow for number here because there is a bug in Virtuoso
      // where booleans are returned as integers
      throw new Error("Given value is not a number or boolean");
    }

    return !!this.value;
  }

  isNull(): boolean {
    return this.value === null;
  }

  isUndefined(): boolean {
    return this.value === undefined;
  }

  isEmpty(): boolean {
    return this.isNull() || this.isUndefined();
  }
}

function parseSparqlResponse(
  data: SparqlClientResponse
): Record<string, SparqlClientValue>[] {
  if (!data) {
    return [];
  }
  const vars = data.head.vars;

  if (!data.results) {
    throw new Error("SparqlClientResponse needs to be from a SELECT query");
  }

  return data.results.bindings.map((binding) => {
    const obj: Record<string, SparqlClientValue> = {};
    if (vars === undefined) return obj;
    vars.forEach((varKey) => {
      const bindingVar = binding[varKey];
      if (bindingVar === undefined) {
        return;
      } else if (
        bindingVar.datatype === "http://www.w3.org/2001/XMLSchema#dateTime" &&
        typeof bindingVar.value === "string"
      ) {
        obj[varKey] = new Date(bindingVar.value);
      } else {
        obj[varKey] = bindingVar.value;
      }
    });
    return obj;
  });
}

function reshapeParsedResults(
  data: Record<string, SparqlClientValue>[],
  config: ResourceReshape
): {}[] {
  const { idProp, destIdProp, propShapers } = config;
  const groups = Object.groupBy(data, (row) => {
    const responseValue = row[idProp];
    if (!responseValue) {
      throw new Error(`Could not find key ${idProp}`);
    }
    if (responseValue === undefined) {
      throw new Error(`"${idProp}" can not be undefined`);
    }
    if (responseValue instanceof Date) {
      return responseValue.toString();
    } else if (typeof responseValue === "number") {
      return responseValue.toString();
    } else {
      return responseValue.toString();
    }
  });

  return Object.entries(groups).map(([key, value]) => {
    const out: { [key: string]: [] | {} | undefined } = {};

    out[destIdProp ?? idProp] = key;

    if (!value || !value[0]) return out;

    for (const [propName, shaper] of Object.entries(propShapers ?? {})) {
      if (shaper.kind === "resource") {
        out[propName] = reshapeParsedResults(value, shaper);
      } else if (shaper.kind === "literal") {
        if (!shaper.method || shaper.method === "takeOne") {
          out[propName] = value[0][shaper.sourceProp ?? propName];
        } else if (shaper.method === "collect") {
          out[propName] = value.map(
            (row) => row[shaper.sourceProp ?? propName]
          );
        }
      }
    }

    return out;
  });
}

function booleanize(response: SparqlClientResponse, variableNames: string[]) {
  if (!response?.results) return;
  response.results.bindings.forEach((binding) => {
    for (const varName of variableNames) {
      const sparqlValue = binding[varName];
      if (sparqlValue === undefined)
        throw new Error(`Variable ${varName} not found in the response`);
      sparqlValue.value = sparqlValue.value === "0" ? false : true;
    }
  });
}

function parseAndReshape(
  results: SparqlClientResponse,
  config: ResourceReshape
) {
  const parsed = parseSparqlResponse(results);
  return reshapeParsedResults(parsed, config);
}

export {
  parseSparqlResponse,
  parseAndReshape,
  reshapeParsedResults,
  ResourceReshape,
  prefixHeaderLines,
  SparqlValue,
  booleanize,
};
