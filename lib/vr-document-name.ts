import { parse, format } from 'date-fns';
// import { invert } from './utils';

// const numbersBylatinAdverbialNumberals = {
//   '': 1,
//   'bis': 2,
//   'ter': 3,
//   'quater': 4,
//   'quinquies': 5,
//   'sexies': 6,
//   'septies': 7,
//   'octies': 8,
//   'novies': 9,
//   'decies': 10,
//   'undecies': 11,
//   'duodecies': 12,
//   'ter decies': 13,
//   'quater decies': 14,
//   'quindecies': 15,
// };

// const latinAdverbialNumberals = invert(numbersBylatinAdverbialNumberals);

export default class VRDocumentName {
  name: string;

  static get regexGroups() {
    return Object.freeze({
      date: '(?<date>[12][90][0-9]{2} [0-3][0-9][01][0-9])',
      casePrefix: '(?<casePrefix>( VV)|())',  // VV = Vlaamse Veerkracht
      docType: '(?<docType>(DOC)|(DEC)|(MED))',
      remainder: '(?<remainder>.*?)',
      // caseNr: '(?<caseNr>\\d{4})',
      // index: '(?<index>\\d{1,3})',
      // versionSuffix: `(?<versionSuffix>(${Object.values(latinAdverbialNumberals).map((suffix: any) => suffix.toUpperCase())
      //   .join(')|(')}))`.replace('()|', ''), // Hack to get out the value for piece '0'
    });
  }

  // static get looseRegex() {
  //   const regexGroup = VRDocumentName.regexGroups;
  //   return new RegExp(`VR ${regexGroup.date}${regexGroup.casePrefix} ${regexGroup.docType}\\.${regexGroup.caseNr}([/-]${regexGroup.index})?(.*?)${regexGroup.versionSuffix}?$`);
  // }

  // static get strictRegex() {
  //   const regexGroup = VRDocumentName.regexGroups;
  //   return new RegExp(`^VR ${regexGroup.date}${regexGroup.casePrefix} ${regexGroup.docType}\\.${regexGroup.caseNr}(/${regexGroup.index})?${regexGroup.versionSuffix}?$`);
  // }

  static get strictRegex() {
    const regexGroup = VRDocumentName.regexGroups;
    return new RegExp(`VR ${regexGroup.date}${regexGroup.casePrefix} ${regexGroup.docType}\\.${regexGroup.remainder}$`);
  }

  constructor(name: string) {
    this.name = name?.trim();
    if (!this.isValid) {
      // why?
      this.name = '';
      // throw new Error(`Invalid VR Document Name "${this.name}" (strict mode)`);
    }
  }

  toString() {
    return this.name;
  }

  get regex() {
    return VRDocumentName.strictRegex;
  }

  parseMeta() {
    const match = this.regex.exec(this.name);
    if (!match && match !== undefined) {
      throw new Error(`Couldn't parse VR Document Name "${this.name}"`);
    }
    const date = parse(match.groups?.['date'], 'yyyy ddMM', new Date());
    const meta = {
      dateRaw: match.groups?.['date'],
      date,
      casePrefix: match.groups?.['casePrefix'],
      docType: match.groups?.['docType'],
      remainder: match.groups?.['remainder'],
    };
    return meta;
  }

  get isValid() {
    return VRDocumentName.strictRegex.test(this.name);
  }

  vrDateReplaced(newDate: Date) {
    try {
      const meta = this.parseMeta();
      const formattedNewDate = format(newDate, 'yyyy ddMM');
      return `VR ${formattedNewDate}${meta.casePrefix} ${meta.docType}.${meta.remainder}`;
    } catch(error) {
      return this.name;
    }
  }
}
