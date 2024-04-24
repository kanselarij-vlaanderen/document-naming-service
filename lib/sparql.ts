import { SparqlClientResult, SparqlClientValue } from "mu";

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

function parseSparqlResults<T extends string>(
  data: SparqlClientResult<T>
): Record<T, SparqlClientValue>[] {
  if (!data) {
    return [];
  }
  const vars = data.head.vars;
  return data.results.bindings.map((binding) => {
    const obj: Record<string, SparqlClientValue> = {};
    vars.forEach((varKey) => {
      obj[varKey] = binding[varKey]?.value;
    });
    return obj satisfies Record<T, SparqlClientValue>;
  });
}

function reshapeParsedResults(
  data: Record<string, SparqlClientValue>[],
  config: ResourceReshape
): {}[] {
  const { idProp, destIdProp, propShapers } = config;
  const groups = Object.groupBy(data, (row) => {
    if (!(idProp in row)) {
      throw new Error(`Could not find key ${idProp}`);
    }
    const prop = row[idProp];
    if (prop === undefined) {
      throw new Error(`"${idProp}" can not be undefined`);
    }
    if (prop instanceof Date) {
      return prop.toString();
    }

    return prop;
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

function parseAndReshape<S extends string>(
  results: SparqlClientResult<S>,
  config: ResourceReshape
) {
  const parsed = parseSparqlResults(results);
  return reshapeParsedResults(parsed, config);
}

function mapObjectValues(object: {}, fn: (value: any) => any) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, fn(value)])
  );
}

// function groupSparqlResults(data: SparqlClientResult, keys: string): any[] {
//   if (!keys) throw new Error("At least one grouping key must be supplied.")
//   if (!data) return [];
//   const parsed = parseSparqlResults(data);
//   const obj: any = {};
//   return parsed.reduce((acc, entry) => {
//     const keys = Object.keys(entry);

//     return acc;
//   });
// }

export {
  parseSparqlResults,
  parseAndReshape,
  reshapeParsedResults,
  ResourceReshape,
};
