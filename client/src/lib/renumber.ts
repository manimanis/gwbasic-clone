/**
 * GWBASIC Line Renumberer
 * Re-numbers all line numbers in a GWBASIC program (10, 20, 30, ...)
 * and updates GOTO/GOSUB/ON...GOTO etc. references accordingly.
 */

// Regex to match GOTO/GOSUB followed by a number, ON expr GOTO/GOSUB
// Also handles RESTORE with line number
const REFERENCE_REGEX = /\b(GOTO|GOSUB|THEN|RESTORE)\s+(\d+)\b/gi;
const ON_REFERENCE_REGEX = /\b(ON\s+.+?\s+)(GOTO|GOSUB)\s+(\d+)((?:\s*,\s*\d+)*)/gi;
const LABEL_REGEX = /^\s*(\d+)\s/;

export interface RenumberResult {
  code: string;
  changes: Array<{ oldLine: number; newLine: number }>;
  success: boolean;
  message?: string;
}

/**
 * Renumber all lines in a GWBASIC program.
 * Lines are first sorted by their original line number, then renumbered
 * with the given start and step (multiples of 10 by default).
 * All references (GOTO, GOSUB, THEN, RESTORE, ON...GOTO/GOSUB) are updated.
 *
 * @param code - The GWBASIC program source code.
 * @param start - Starting line number (default: 10).
 * @param step - Step between lines (default: 10).
 * @returns The renumbered program code.
 */
export function renumber(code: string, start: number = 10, step: number = 10): RenumberResult {
  const lines = code.split('\n');
  const lineMapping: Map<number, number> = new Map();
  const changes: Array<{ oldLine: number; newLine: number }> = [];

  // Separate numbered and unnumbered lines
  const numberedLines: Array<{ index: number; original: number; text: string }> = [];
  const unnumberedLines: Array<{ index: number; text: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s*(\d+)(\s+.*)?$/);
    if (match) {
      numberedLines.push({
        index: i,
        original: parseInt(match[1], 10),
        text: (match[2] || '').trim(),
      });
    } else {
      unnumberedLines.push({ index: i, text: lines[i] });
    }
  }

  // Sort numbered lines by their original line number (ascending)
  numberedLines.sort((a, b) => a.original - b.original);

  // Build mapping and assign new line numbers (multiples of step starting from start)
  let newLineNum = start;
  for (const entry of numberedLines) {
    lineMapping.set(entry.original, newLineNum);
    changes.push({ oldLine: entry.original, newLine: newLineNum });
    newLineNum += step;
  }

  // Rebuild the lines array: sorted numbered lines first, then unnumbered
  const newLines: string[] = [];
  for (const entry of numberedLines) {
    newLines.push(`${lineMapping.get(entry.original)} ${entry.text}`);
  }
  for (const entry of unnumberedLines) {
    newLines.push(entry.text);
  }

  // Update all references (GOTO, GOSUB, THEN, RESTORE, ON...GOTO/GOSUB)
  for (let i = 0; i < newLines.length; i++) {
    // Update simple GOTO/GOSUB/THEN/RESTORE references
    newLines[i] = newLines[i].replace(REFERENCE_REGEX, (match, keyword, numStr) => {
      const oldRef = parseInt(numStr, 10);
      const newRef = lineMapping.get(oldRef);
      if (newRef !== undefined) {
        return `${keyword} ${newRef}`;
      }
      return match;
    });

    // Update ON...GOTO/ON...GOSUB with comma-separated labels
    newLines[i] = newLines[i].replace(ON_REFERENCE_REGEX, (match, prefix, keyword, firstLabel, restLabels) => {
      const updateLabel = (label: string): string => {
        const trimmed = label.trim();
        const num = parseInt(trimmed, 10);
        if (!isNaN(num)) {
          const newRef = lineMapping.get(num);
          if (newRef !== undefined) return ` ${newRef}`;
        }
        return ` ${trimmed}`;
      };

      const newFirst = updateLabel(firstLabel);
      const newRest = restLabels
        ? restLabels.split(',').map((l: string) => updateLabel(l)).join(',')
        : '';
      return `${prefix}${keyword}${newFirst}${newRest}`;
    });
  }

  return {
    code: newLines.join('\n'),
    changes,
    success: true,
  };
}

/**
 * Sorts lines by their line numbers and renumbers them.
 * Alias for renumber() which now handles sorting internally.
 */
export function sortAndRenumber(code: string, start: number = 10, step: number = 10): RenumberResult {
  return renumber(code, start, step);
}