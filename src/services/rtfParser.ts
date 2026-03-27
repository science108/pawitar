import type { RtfParagraph, RtfSection } from '../types';

const WIN1250: Record<number, string> = {
  0x80: '\u20AC', 0x82: '\u201A', 0x84: '\u201E', 0x85: '\u2026',
  0x86: '\u2020', 0x87: '\u2021', 0x89: '\u2030', 0x8A: '\u0160',
  0x8B: '\u2039', 0x8C: '\u015A', 0x8D: '\u0164', 0x8E: '\u017D',
  0x8F: '\u0179', 0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C',
  0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
  0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u015B',
  0x9D: '\u0165', 0x9E: '\u017E', 0x9F: '\u017A', 0xA0: '\u00A0',
  0xA1: '\u02C7', 0xA2: '\u02D8', 0xA3: '\u0141', 0xA4: '\u00A4',
  0xA5: '\u0104', 0xA6: '\u00A6', 0xA7: '\u00A7', 0xA8: '\u00A8',
  0xA9: '\u00A9', 0xAA: '\u015E', 0xAB: '\u00AB', 0xAC: '\u00AC',
  0xAD: '\u00AD', 0xAE: '\u00AE', 0xAF: '\u017B', 0xB0: '\u00B0',
  0xB1: '\u00B1', 0xB2: '\u02DB', 0xB3: '\u0142', 0xB4: '\u00B4',
  0xB5: '\u00B5', 0xB6: '\u00B6', 0xB7: '\u00B7', 0xB8: '\u00B8',
  0xB9: '\u0105', 0xBA: '\u015F', 0xBB: '\u00BB', 0xBC: '\u013D',
  0xBD: '\u02DD', 0xBE: '\u013E', 0xBF: '\u017C', 0xC0: '\u0154',
  0xC1: '\u00C1', 0xC2: '\u00C2', 0xC3: '\u0102', 0xC4: '\u00C4',
  0xC5: '\u0139', 0xC6: '\u0106', 0xC7: '\u00C7', 0xC8: '\u010C',
  0xC9: '\u00C9', 0xCA: '\u0118', 0xCB: '\u00CB', 0xCC: '\u011A',
  0xCD: '\u00CD', 0xCE: '\u00CE', 0xCF: '\u010E', 0xD0: '\u0110',
  0xD1: '\u0143', 0xD2: '\u0147', 0xD3: '\u00D3', 0xD4: '\u00D4',
  0xD5: '\u0150', 0xD6: '\u00D6', 0xD7: '\u00D7', 0xD8: '\u0158',
  0xD9: '\u016E', 0xDA: '\u00DA', 0xDB: '\u0170', 0xDC: '\u00DC',
  0xDD: '\u00DD', 0xDE: '\u0162', 0xDF: '\u00DF', 0xE0: '\u0155',
  0xE1: '\u00E1', 0xE2: '\u00E2', 0xE3: '\u0103', 0xE4: '\u00E4',
  0xE5: '\u013A', 0xE6: '\u0107', 0xE7: '\u00E7', 0xE8: '\u010D',
  0xE9: '\u00E9', 0xEA: '\u0119', 0xEB: '\u00EB', 0xEC: '\u011B',
  0xED: '\u00ED', 0xEE: '\u00EE', 0xEF: '\u010F', 0xF0: '\u0111',
  0xF1: '\u0144', 0xF2: '\u0148', 0xF3: '\u00F3', 0xF4: '\u00F4',
  0xF5: '\u0151', 0xF6: '\u00F6', 0xF7: '\u00F7', 0xF8: '\u0159',
  0xF9: '\u016F', 0xFA: '\u00FA', 0xFB: '\u0171', 0xFC: '\u00FC',
  0xFD: '\u00FD', 0xFE: '\u0163', 0xFF: '\u02D9',
};

function decodeAnsiChar(hex: string): string {
  const code = parseInt(hex, 16);
  if (code < 0x80) return String.fromCharCode(code);
  return WIN1250[code] ?? String.fromCharCode(code);
}

interface ParserState {
  bold: boolean;
  italic: boolean;
  ucSkip: number;
  inHeader: boolean;
  groupDepth: number;
  headerGroupDepth: number;
}

export function parseRtf(rtfContent: string): RtfParagraph[] {
  const paragraphs: RtfParagraph[] = [];
  let currentText = '';
  let currentBold = false;

  const state: ParserState = {
    bold: false,
    italic: false,
    ucSkip: 1,
    inHeader: false,
    groupDepth: 0,
    headerGroupDepth: 0,
  };

  const stateStack: ParserState[] = [];
  let i = 0;

  function flushParagraph() {
    const trimmed = currentText.replace(/\s+/g, ' ').trim();
    if (trimmed) {
      paragraphs.push({ text: trimmed, isBold: currentBold });
    }
    currentText = '';
  }

  while (i < rtfContent.length) {
    const ch = rtfContent[i];

    if (ch === '{') {
      stateStack.push({ ...state });
      state.groupDepth++;

      // Detect header groups like {\info, {\fonttbl, {\colortbl, {\*\expandedcolortbl
      const ahead = rtfContent.substring(i + 1, i + 30);
      if (ahead.match(/^\\(?:\*\\)?(?:info|fonttbl|colortbl|expandedcolortbl|stylesheet)/)) {
        state.inHeader = true;
        state.headerGroupDepth = state.groupDepth;
      }
      i++;
      continue;
    }

    if (ch === '}') {
      if (state.inHeader && state.groupDepth === state.headerGroupDepth) {
        state.inHeader = false;
      }
      const prev = stateStack.pop();
      if (prev) {
        state.bold = prev.bold;
        state.italic = prev.italic;
        state.ucSkip = prev.ucSkip;
        state.groupDepth = prev.groupDepth;
        if (!state.inHeader && prev.inHeader) {
          state.inHeader = prev.inHeader;
          state.headerGroupDepth = prev.headerGroupDepth;
        }
      }
      i++;
      continue;
    }

    if (state.inHeader) {
      i++;
      continue;
    }

    if (ch === '\\') {
      i++;
      if (i >= rtfContent.length) break;

      const nextCh = rtfContent[i];

      // Escaped special chars
      if (nextCh === '\\' || nextCh === '{' || nextCh === '}') {
        currentText += nextCh;
        i++;
        continue;
      }

      // ANSI escape \'XX
      if (nextCh === '\'') {
        const hex = rtfContent.substring(i + 1, i + 3);
        currentText += decodeAnsiChar(hex);
        i += 3;
        continue;
      }

      // Control word
      let word = '';
      while (i < rtfContent.length && /[a-zA-Z]/.test(rtfContent[i])) {
        word += rtfContent[i];
        i++;
      }

      let param = '';
      if (i < rtfContent.length && /[-\d]/.test(rtfContent[i])) {
        if (rtfContent[i] === '-') {
          param += '-';
          i++;
        }
        while (i < rtfContent.length && /\d/.test(rtfContent[i])) {
          param += rtfContent[i];
          i++;
        }
      }

      // Space delimiter after control word
      if (i < rtfContent.length && rtfContent[i] === ' ') {
        i++;
      }

      const numParam = param ? parseInt(param, 10) : undefined;

      switch (word) {
        case 'par':
        case 'pard':
          flushParagraph();
          break;
        case 'line':
          currentText += '\n';
          break;
        case 'b':
          state.bold = numParam !== 0;
          currentBold = state.bold;
          break;
        case 'i':
          state.italic = numParam !== 0;
          break;
        case 'u': {
          if (numParam !== undefined) {
            // Handle negative unicode values
            const codePoint = numParam < 0 ? numParam + 65536 : numParam;
            // Skip special Unicode chars that are just line separators
            if (codePoint === 8232) {
              currentText += '\n';
            } else if (codePoint === 8194 || codePoint === 8195) {
              currentText += ' ';
            } else {
              currentText += String.fromCodePoint(codePoint);
            }
            // Skip uc replacement characters
            let skip = state.ucSkip;
            while (skip > 0 && i < rtfContent.length) {
              if (rtfContent[i] === '\\' || rtfContent[i] === '{' || rtfContent[i] === '}') break;
              i++;
              skip--;
            }
          }
          break;
        }
        case 'uc':
          state.ucSkip = numParam ?? 1;
          break;
        case 'f':
          // Font switch: f1/f3 = bold, f4/f5 = italic, f0/f2 = roman
          if (numParam === 1 || numParam === 3) {
            state.bold = true;
            currentBold = true;
          } else if (numParam === 4 || numParam === 5) {
            state.italic = true;
          } else {
            state.italic = false;
            if (numParam === 0 || numParam === 2) {
              state.bold = false;
              currentBold = false;
            }
          }
          break;
        case 'tab':
          currentText += '\t';
          break;
        // Ignore formatting control words
        default:
          break;
      }
      continue;
    }

    // Regular text (skip newlines/carriage returns in RTF source)
    if (ch === '\r' || ch === '\n') {
      i++;
      continue;
    }

    currentText += ch;
    i++;
  }

  flushParagraph();
  return paragraphs;
}

export function groupRtfIntoSections(paragraphs: RtfParagraph[]): RtfSection[] {
  const sections: RtfSection[] = [];
  let current: RtfSection = {
    id: 'intro',
    label: 'Wprowadzenie',
    paragraphs: [],
  };

  for (const para of paragraphs) {
    const verseMatch = para.text.match(/^WERSET\s+(\d+)$/);
    if (verseMatch && para.isBold) {
      if (current.paragraphs.length > 0) {
        sections.push(current);
      }
      current = {
        id: `verse-${verseMatch[1]}`,
        label: `Werset ${verseMatch[1]}`,
        paragraphs: [para],
      };
    } else {
      current.paragraphs.push(para);
    }
  }

  if (current.paragraphs.length > 0) {
    sections.push(current);
  }

  return sections;
}
