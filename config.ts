const COUNTER_BLACKLIST = {
  regular: {
    doc: parseToNumberList(process.env.BLACKLIST_REGULAR_DOC),
    med: parseToNumberList(process.env.BLACKLIST_REGULAR_MED),
    dec: parseToNumberList(process.env.BLACKLIST_REGULAR_DEC),
  },
  pvv: {
    doc: parseToNumberList(process.env.BLACKLIST_PVV_DOC),
    med: parseToNumberList(process.env.BLACKLIST_PVV_MED),
    dec: parseToNumberList(process.env.BLACKLIST_PVV_DEC),
  }
}

function parseToNumberList(value: any) {
  if (!value) {
    return [0];
  }
  const strings = value.split(',');
  return strings.map((str: string) => parseInt(str));
}

export {
  COUNTER_BLACKLIST
}