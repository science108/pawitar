import type { TemplateBlock, VerseSection } from '../types';

const TAG_REGEX = /^@([\w-]+)\s*=\s*/;

const FORMATTING_CODES = [
  /<MI>/g, /<D>/g, /<R>/g, /<->[\r\n]*/g,
  /<~>/g, /<&>[\r\n]*/g, /<k0>/g, /<qc>/g,
  /<_qm>/g, /<\/_qm>/g,
  /<_q>/g, /<\/_q>/g,
  /<_bt>/g, /<\/_bt>/g,
  /<_dt>/g, /<\/_dt>/g,
  /<_dd>/g, /<\/_dd>/g,
  /<_>/g,
  /<P\d*>/g, /<%\d+>/g,
  /<\d+>/g,
  /<MI>,<D>/g,
];

export function stripFormattingCodes(text: string): string {
  let result = text;
  for (const re of FORMATTING_CODES) {
    result = result.replace(re, '');
  }
  // Join lines broken by <-> (soft hyphen continuation)
  result = result.replace(/\n/g, ' ');
  result = result.replace(/\s+/g, ' ').trim();
  return result;
}

export function parseTemplate(text: string): TemplateBlock[] {
  const lines = text.split('\n');
  const blocks: TemplateBlock[] = [];
  let currentTag = '';
  let currentLines: string[] = [];
  let currentLineIndex = 0;

  function flushBlock() {
    if (currentTag && currentLines.length > 0) {
      const rawContent = currentLines.join('\n');
      const contentAfterTag = rawContent.replace(TAG_REGEX, '');
      blocks.push({
        tag: currentTag,
        rawLines: [...currentLines],
        pureText: stripFormattingCodes(contentAfterTag),
        lineIndex: currentLineIndex,
      });
    }
    currentTag = '';
    currentLines = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tagMatch = line.match(TAG_REGEX);

    if (tagMatch) {
      flushBlock();
      currentTag = tagMatch[1];
      currentLines = [line];
      currentLineIndex = i;
    } else if (currentTag) {
      if (line.trim() === '' && !isMultilineTag(currentTag)) {
        flushBlock();
        blocks.push({
          tag: '__empty',
          rawLines: [line],
          pureText: '',
          lineIndex: i,
        });
      } else if (line.trim() === '' && isMultilineTag(currentTag)) {
        flushBlock();
        blocks.push({
          tag: '__empty',
          rawLines: [line],
          pureText: '',
          lineIndex: i,
        });
      } else {
        currentLines.push(line);
      }
    } else {
      if (line.trim() === '') {
        blocks.push({
          tag: '__empty',
          rawLines: [line],
          pureText: '',
          lineIndex: i,
        });
      } else {
        // Continuation line without a tag (part of previous multiline block)
        if (blocks.length > 0 && blocks[blocks.length - 1].tag !== '__empty') {
          const lastBlock = blocks[blocks.length - 1];
          lastBlock.rawLines.push(line);
          const rawContent = lastBlock.rawLines.join('\n');
          const contentAfterTag = rawContent.replace(TAG_REGEX, '');
          lastBlock.pureText = stripFormattingCodes(contentAfterTag);
        } else {
          blocks.push({
            tag: '__continuation',
            rawLines: [line],
            pureText: stripFormattingCodes(line),
            lineIndex: i,
          });
        }
      }
    }
  }
  flushBlock();

  return blocks;
}

function isMultilineTag(tag: string): boolean {
  return [
    'p', 'p1', 'translation', 'synonyms',
    'h1', 'd-uvaca', 'd-anustubh', 'd-tristubh', 'd-jagati',
    'v-uvaca', 'v-anustubh', 'v-tristubh', 'v-jagati',
    'p-jagati', 'p-reference-h',
  ].includes(tag);
}

export function isTextBlock(tag: string): boolean {
  return [
    'p', 'p1', 'translation', 'synonyms',
    'p-jagati', 'p-reference-h',
  ].includes(tag);
}

export function groupIntoVerseSections(blocks: TemplateBlock[]): VerseSection[] {
  const sections: VerseSection[] = [];
  let currentSection: VerseSection = {
    id: 'intro',
    label: 'Wprowadzenie',
    blocks: [],
  };

  for (const block of blocks) {
    if (block.tag === 'text-number') {
      if (currentSection.blocks.length > 0) {
        sections.push(currentSection);
      }
      const verseNum = block.pureText.replace(/WERSET\s*/i, '').trim();
      currentSection = {
        id: `verse-${verseNum}`,
        label: `Werset ${verseNum}`,
        blocks: [block],
      };
    } else {
      currentSection.blocks.push(block);
    }
  }

  if (currentSection.blocks.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}
