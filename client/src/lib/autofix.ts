/**
 * GWBASIC AutoFix - Automatically fixes lint warnings in GWBASIC code
 * 
 * Fixable issues:
 * - W003: Uppercase keywords (makes them uppercase)
 * - W004: Empty line numbers (remove them)
 * - Indentation: auto-indent code inside FOR/NEXT, WHILE/WEND, DO/LOOP, IF/THEN
 */

import { GWBASIC_KEYWORDS, GWBASIC_FUNCTIONS, GWBASIC_NOARG_FUNCTIONS } from '@shared/gwbasic-constants';

// Build a set of all known BASIC identifiers (keywords + functions) for case fixing
const ALL_BASIC_KEYWORDS = new Set([
  ...GWBASIC_KEYWORDS.map(k => k.toUpperCase()),
  ...GWBASIC_FUNCTIONS.map(f => f.toUpperCase()),
  ...GWBASIC_NOARG_FUNCTIONS.map(f => f.toUpperCase()),
]);

export interface AutoFixResult {
  code: string;
  fixes: number;
  description: string;
}

/**
 * Fix all BASIC keywords that are not uppercase.
 * Scans each line, finds lowercase keywords, and converts them to uppercase.
 * Skips string literals and comment lines.
 */
function fixKeywordsUppercase(code: string): AutoFixResult {
  const lines = code.split('\n');
  let fixes = 0;
  const description: string[] = [];

  // Build a sorted list of all known BASIC keywords (longest first for regex matching)
  const allWords = Array.from(ALL_BASIC_KEYWORDS).sort((a, b) => b.length - a.length);
  const pattern = allWords.map(w => w.replace(/[$%!#]/g, '\\$&')).join('|');
  const kwRegex = new RegExp(`\\b(${pattern})\\b`, 'gi');

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const trimmed = text.trim();
    // Skip comment lines
    if (trimmed.startsWith("'") || trimmed.toUpperCase().startsWith('REM')) continue;

    const fixedLine = text.replace(kwRegex, (match, word, offset) => {
      // Skip if inside a string literal
      const beforeQuoteCount = (text.substring(0, offset).match(/"/g) || []).length;
      if (beforeQuoteCount % 2 === 1) return match;

      const upper = word.toUpperCase();
      if (word !== upper) {
        fixes++;
        if (!description.includes(upper)) {
          description.push(upper);
        }
        return upper;
      }
      return match;
    });

    lines[i] = fixedLine;
  }

  return {
    code: lines.join('\n'),
    fixes,
    description: fixes > 0
      ? `Uppercased ${fixes} keyword${fixes > 1 ? 's' : ''}: ${description.join(', ')}`
      : 'No keyword fixes needed',
  };
}

/**
 * Apply all auto-fixable lint issues.
 * Currently supports:
 * - W003: Uppercase keywords
 * 
 * @param code - The GWBASIC program source code.
 * @returns The fixed code with a summary of changes.
 */
/**
 * Auto-indent code inside FOR...NEXT, WHILE...WEND, DO...LOOP, IF...THEN blocks.
 * Each nesting level adds 2 spaces of indentation.
 */
function autoIndent(code: string): AutoFixResult {
  const lines = code.split('\n');
  let indentLevel = 0;
  const indentSize = 2;
  let fixes = 0;

  // Keywords that increase indent (open a block)
  const openKeywords = /^(?:\s*(?:\d+\s+)?)(FOR|WHILE|DO|IF)\b/i;
  // Keywords that decrease indent before their line (close a block)
  const closeKeywords = /^(?:\s*(?:\d+\s+)?)(NEXT|WEND|LOOP)\b/i;
  // ELSE decreases then increases
  const elseKeyword = /^(?:\s*(?:\d+\s+)?)(ELSE)\b/i;
  // END decreases indent (for END IF)
  const endKeyword = /^(?:\s*(?:\d+\s+)?)(END)\b/i;

  // Check if IF statement has a THEN on same line (block IF vs single-line IF)
  const hasThenOnLine = (line: string) => /\bTHEN\b/i.test(line);
  const isSingleLineIf = (line: string) => {
    // IF ... THEN <statement> (no newline after THEN) = single-line IF, no indent
    const thenMatch = line.match(/\bTHEN\s+(.+)/i);
    if (!thenMatch) return false;
    const afterThen = thenMatch[1].trim();
    // If THEN is followed by a line number or a statement keyword, it's single-line
    return /^\d+\s/.test(afterThen) || /^(?:PRINT|LET|IF|FOR|WHILE|GOTO|GOSUB|DIM|REM|CLS|INPUT|COLOR|LOCATE|WRITE|DATA|READ|RESTORE|SWAP|SELECT)\b/.test(afterThen);
  };

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const trimmed = originalLine.trim();
    if (!trimmed) continue;

    // Check if this line closes a block BEFORE applying indent
    if (closeKeywords.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    if (elseKeyword.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    if (endKeyword.test(trimmed) && /\bEND\b/i.test(trimmed) && /\bIF\b/i.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Calculate expected indentation
    const expectedIndent = ' '.repeat(indentLevel * indentSize);
    
    // Extract line number if present and build new line
    const lineNumMatch = originalLine.match(/^(\s*)(\d+)(\s+.*)$/);
    let newLine: string;
    
    if (lineNumMatch) {
      const lineNum = lineNumMatch[2];
      const content = lineNumMatch[3].replace(/^\s+/, '');
      newLine = `${lineNum} ${expectedIndent}${content}`;
    } else {
      // No line number
      newLine = `${expectedIndent}${trimmed}`;
    }

    if (newLine !== originalLine) {
      fixes++;
      lines[i] = newLine;
    }

    // Check if this line opens a block AFTER applying indent
    if (openKeywords.test(trimmed)) {
      // Only increase indent for block IF (IF...THEN followed by newline)
      if (/\bIF\b/i.test(trimmed)) {
        if (!isSingleLineIf(trimmed) && hasThenOnLine(trimmed)) {
          indentLevel++;
        }
        // Also increase if THEN is on its own (then next lines are block)
      } else {
        indentLevel++;
      }
    }
  }

  return {
    code: lines.join('\n'),
    fixes,
    description: fixes > 0
      ? `Indented ${fixes} line${fixes > 1 ? 's' : ''}`
      : 'No indentation needed',
  };
}

/**
 * Apply all auto-fixable lint issues.
 * Currently supports:
 * - W003: Uppercase keywords
 * - W004: Empty line numbers (remove them)
 * - Auto-indentation
 * 
 * @param code - The GWBASIC program source code.
 * @returns The fixed code with a summary of changes.
 */
export function autoFix(code: string): AutoFixResult {
  let currentCode = code;
  let totalFixes = 0;
  const descriptions: string[] = [];

  // Fix 1: Uppercase keywords
  const keywordFix = fixKeywordsUppercase(currentCode);
  currentCode = keywordFix.code;
  totalFixes += keywordFix.fixes;
  if (keywordFix.fixes > 0) {
    descriptions.push(keywordFix.description);
  }

  // Fix 2: Remove empty line numbers (lines with just a number, no instruction)
  const emptyLines = currentCode.split('\n');
  let removedEmpty = 0;
  const fixedLines: string[] = [];
  for (let i = 0; i < emptyLines.length; i++) {
    const trimmed = emptyLines[i].trim();
    if (/^\d+\s*$/.test(trimmed)) {
      removedEmpty++;
    } else {
      fixedLines.push(emptyLines[i]);
    }
  }
  if (removedEmpty > 0) {
    currentCode = fixedLines.join('\n');
    totalFixes += removedEmpty;
    descriptions.push(`Removed ${removedEmpty} empty line number${removedEmpty > 1 ? 's' : ''}`);
  }

  // Fix 3: Auto-indent code inside blocks
  const indentFix = autoIndent(currentCode);
  currentCode = indentFix.code;
  totalFixes += indentFix.fixes;
  if (indentFix.fixes > 0) {
    descriptions.push(indentFix.description);
  }

  return {
    code: currentCode,
    fixes: totalFixes,
    description: totalFixes > 0
      ? descriptions.join('; ')
      : 'No auto-fixable issues found',
  };
}
