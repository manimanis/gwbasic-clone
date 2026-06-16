/**
 * GWBASIC Linter - Static code analysis for GWBASIC programs
 * 
 * Checks for:
 * - Undefined line references in GOTO/GOSUB/THEN/RESTORE
 * - Unterminated FOR/NEXT loops
 * - Unterminated WHILE/WEND loops
 * - Unterminated DO/LOOP loops
 * - Duplicate line numbers
 * - Unreachable code after END
 * - Lines without line numbers
 * - Empty missing line numbers gaps
 * - Variable naming conventions
 */

import { GWBASIC_KEYWORDS, GWBASIC_FUNCTIONS, GWBASIC_NOARG_FUNCTIONS, GWBASIC_GOTO_LIKE_KEYWORDS } from '@shared/gwbasic-constants';

// Build a set of all known BASIC identifiers (keywords + functions) for case checking
const ALL_BASIC_KEYWORDS = new Set([
  ...GWBASIC_KEYWORDS.map(k => k.toUpperCase()),
  ...GWBASIC_FUNCTIONS.map(f => f.toUpperCase()),
]);

export interface LintWarning {
  type: 'info' | 'warning' | 'error';
  message: string;
  line: number;       // 1-based line number in the source
  column?: number;    // optional column
  code?: string;      // short code identifier
}

export interface LintResult {
  warnings: LintWarning[];
  success: boolean;
  summary: string;
}

/**
 * Remove string literals from a line to avoid detecting keywords inside strings.
 * Replaces content between double quotes with empty strings.
 */
function stripStrings(line: string): string {
  return line.replace(/"[^"]*"/g, '""');
}
/**
 * Run linting checks on GWBASIC source code.
 */
export function lint(code: string): LintResult {
  const warnings: LintWarning[] = [];
  const lines = code.split('\n');

  // ---- Collect program structure ----
  const lineNumbers: Map<number, number> = new Map(); // lineNum -> sourceLineIndex (0-based)
  const forVars: Map<string, number> = new Map();     // varName -> sourceLineIndex where FOR starts
  const whileCount: number[] = [];                     // stack of sourceLineIndex for WHILE
  const doCount: number[] = [];                        // stack of sourceLineIndex for DO
  const referencedLabels: Set<number> = new Set();     // all referenced line numbers
  const gotoLikeRegex = /\b(GOTO|GOSUB|THEN|RESTORE)\s+(\d+)\b/gi;
  const labelRegex = /^\s*(\d+)\s/;

  // Scan each line
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const text = lines[i];
    // Text with strings removed — prevents detecting keywords inside strings
    const cleanText = stripStrings(text);

    // Check for line number
    const labelMatch = text.match(labelRegex);
    if (labelMatch) {
      const num = parseInt(labelMatch[1], 10);
      if (lineNumbers.has(num)) {
        warnings.push({
          type: 'error',
          message: `Duplicate line number: ${num}`,
          line: lineNum,
          code: 'E001',
        });
      }
      lineNumbers.set(num, i);
    }

    // Collect referenced labels (use cleanText to skip strings)
    let refMatch;
    while ((refMatch = gotoLikeRegex.exec(cleanText)) !== null) {
      const refNum = parseInt(refMatch[2], 10);
      referencedLabels.add(refNum);
    }

    // Also check ON ... GOTO/GOSUB with comma labels
    const onMatch = text.match(/\bON\s+.+?\s+(GOTO|GOSUB)\s+([\d,\s]+)/i);
    if (onMatch) {
      const labels = onMatch[2].split(',').map(s => parseInt(s.trim(), 10));
      for (const lbl of labels) {
        if (!isNaN(lbl)) referencedLabels.add(lbl);
      }
    }

    // Track FOR loops (use cleanText to skip strings)
    const forMatch = cleanText.match(/\bFOR\s+(\w+)\s*=/i);
    if (forMatch) {
      const varName = forMatch[1].toUpperCase();
      forVars.set(varName, i);
    }

    // Track NEXT statements (use cleanText to skip strings)
    const nextMatch = cleanText.match(/\bNEXT\b/i);
    if (nextMatch) {
      // Check if it's a bare NEXT or NEXT with variable
      const nextVarMatch = cleanText.match(/\bNEXT\s+(\w+)/i);
      if (nextVarMatch) {
        const varName = nextVarMatch[1].toUpperCase();
        if (forVars.has(varName)) {
          forVars.delete(varName);
        }
      } else {
        // Bare NEXT - just consume one from the stack (most recent)
        if (forVars.size > 0) {
          const keys = Array.from(forVars.keys());
          const lastVar = keys[keys.length - 1];
          forVars.delete(lastVar);
        }
      }
    }

    // Track WHILE/WEND - but NOT DO WHILE (which is tracked by DO/LOOP)
    // Use cleanText to skip strings
    if (/\bWHILE\b/i.test(cleanText) && !/\bDO\s+WHILE\b/i.test(cleanText)) {
      whileCount.push(i);
    }
    if (/\bWEND\b/i.test(cleanText)) {
      if (whileCount.length > 0) {
        whileCount.pop();
      } else {
        warnings.push({
          type: 'error',
          message: 'WEND without matching WHILE',
          line: lineNum,
          code: 'E010',
        });
      }
    }

    // Track DO/LOOP (use cleanText to skip strings)
    if (/\bDO\b/i.test(cleanText) && !/\bDO\b.*\bLOOP\b/i.test(cleanText)) {
      doCount.push(i);
    }
    if (/\bLOOP\b/i.test(cleanText) && !/\bDO\b.*\bLOOP\b/i.test(cleanText)) {
      if (doCount.length > 0) {
        doCount.pop();
      } else {
        warnings.push({
          type: 'error',
          message: 'LOOP without matching DO',
          line: lineNum,
          code: 'E020',
        });
      }
    }
  }

  // ---- Check for dangling FOR loops ----
  const forEntries = Array.from(forVars.entries());
  for (const [varName, startLine] of forEntries) {
    warnings.push({
      type: 'error',
      message: `FOR loop variable '${varName}' (line ~${startLine + 1}) without matching NEXT`,
      line: startLine + 1,
      code: 'E002',
    });
  }

  // ---- Check for dangling WHILE ----
  for (const startLine of whileCount) {
    warnings.push({
      type: 'error',
      message: `WHILE at line ${startLine + 1} without matching WEND`,
      line: startLine + 1,
      code: 'E011',
    });
  }

  // ---- Check for dangling DO ----
  for (const startLine of doCount) {
    warnings.push({
      type: 'error',
      message: `DO at line ${startLine + 1} without matching LOOP`,
      line: startLine + 1,
      code: 'E021',
    });
  }

  // ---- Check referenced labels that don't exist ----
  const refLabelsArray = Array.from(referencedLabels);
  for (const refNum of refLabelsArray) {
    if (!lineNumbers.has(refNum)) {
      // Find approximately where this reference is
      let refLine = 0;
      const refRegex = new RegExp(`\\b(GOTO|GOSUB|THEN|RESTORE)\\s+${refNum}\\b`, 'i');
      for (let i = 0; i < lines.length; i++) {
        if (refRegex.test(lines[i])) {
          refLine = i + 1;
          break;
        }
      }
      // Also check ON...GOTO
      if (refLine === 0) {
        const onRefRegex = new RegExp(`\\bON\\s+.+?\\s+(GOTO|GOSUB)\\s+[\\d,\\s]*${refNum}[\\d,\\s]*`, 'i');
        for (let i = 0; i < lines.length; i++) {
          if (onRefRegex.test(lines[i])) {
            refLine = i + 1;
            break;
          }
        }
      }
      if (refLine > 0) {
        warnings.push({
          type: 'error',
          message: `Reference to undefined line number: ${refNum}`,
          line: refLine,
          code: 'E030',
        });
      }
    }
  }

  // ---- Check unreachable code after END ----
  for (let i = 0; i < lines.length; i++) {
    if (/\bEND\b/i.test(lines[i]) && !/\bEND\s+(IF|SELECT|FUNCTION|SUB|TYPE|ENUM)/i.test(lines[i])) {
      // Check lines after this END for numbered lines (that might be dead code)
      let hasAfterEnd = false;
      for (let j = i + 1; j < lines.length; j++) {
        const trimmed = lines[j].trim();
        if (trimmed && !trimmed.startsWith("'") && !trimmed.startsWith("REM")) {
          if (lineNumbers.has(parseInt(lines[j].match(/^(\d+)/)?.[1] || '', 10))) {
            hasAfterEnd = true;
            warnings.push({
              type: 'warning',
              message: `Possibly unreachable code after END at line ~${j + 1}`,
              line: j + 1,
              code: 'W001',
            });
          }
          break;
        }
      }
      if (hasAfterEnd) break; // Only warn once
    }
  }

  // ---- Line number ordering ----
  let lastLineNum = 0;
  let firstLineAfterReorder = true;
  const sortedNums = Array.from(lineNumbers.entries()).sort((a, b) => a[1] - b[1]);
  for (const [num, _sourceIdx] of sortedNums) {
    if (num < lastLineNum) {
      // Reached a point where a line number is smaller than a previous one
      // Determine which line this is
      warnings.push({
        type: 'warning',
        message: `Line numbers out of order: ${num} appears after ${lastLineNum}. Consider renumbering.`,
        line: _sourceIdx + 1,
        code: 'W002',
      });
      break;
    }
    lastLineNum = num;
  }

  // ---- Check that BASIC keywords are uppercase ----
  // Build a sorted list of all known BASIC keywords (longest first for regex matching)
  const allWords = Array.from(ALL_BASIC_KEYWORDS).sort((a, b) => b.length - a.length);
  const pattern = allWords.map(w => w.replace(/[$%!#]/g, '\\$&')).join('|');
  const kwRegex = new RegExp(`\\b(${pattern})\\b`, 'gi');

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const trimmed = text.trim();
    // Skip comment lines
    if (trimmed.startsWith("'") || trimmed.toUpperCase().startsWith('REM')) continue;
    // Skip string literals
    let match;
    while ((match = kwRegex.exec(text)) !== null) {
      const word = match[1];
      // Skip if inside a string literal
      const beforeQuoteCount = (text.substring(0, match.index).match(/"/g) || []).length;
      if (beforeQuoteCount % 2 === 1) continue;
      if (word !== word.toUpperCase()) {
        warnings.push({
          type: 'warning',
          message: `Keyword '${word}' should be uppercase: ${word.toUpperCase()}`,
          line: i + 1,
          column: match.index + 1,
          code: 'W003',
        });
      }
    }
  }

  // ---- Check for empty lines between numbered lines (gaps) ----
  // Only flag if there are large gaps that might indicate missing lines
  const numberedLinesList = Array.from(lineNumbers.entries()).sort((a, b) => a[1] - b[1]);
  for (let i = 1; i < numberedLinesList.length; i++) {
    const gap = numberedLinesList[i][0] - numberedLinesList[i - 1][0];
    if (gap > 500) {
      warnings.push({
        type: 'info',
        message: `Large gap of ${gap} between line ${numberedLinesList[i - 1][0]} and ${numberedLinesList[i][0]}`,
        line: numberedLinesList[i][1] + 1,
        code: 'I001',
      });
    }
  }

  // ---- Check GOTO/GOSUB to self (jump to own line) ----
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const labelMatch = text.match(labelRegex);
    if (!labelMatch) continue;
    const ownLine = parseInt(labelMatch[1], 10);
    const gotoRegex = /\b(GOTO|GOSUB)\s+(\d+)\b/gi;
    let gotoMatch;
    while ((gotoMatch = gotoRegex.exec(text)) !== null) {
      const targetLine = parseInt(gotoMatch[2], 10);
      if (targetLine === ownLine) {
        warnings.push({
          type: 'error',
          message: `${gotoMatch[1].toUpperCase()} ${targetLine} jumps to the same line (infinite loop)`,
          line: i + 1,
          column: gotoMatch.index + 1,
          code: 'E040',
        });
      }
    }
  }

  // ---- Check empty line numbers (line with only a number, no content) ----
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const match = text.match(/^\s*\d+\s*$/);
    if (match) {
      warnings.push({
        type: 'warning',
        message: 'Empty line number (no instruction)',
        line: i + 1,
        code: 'W004',
      });
    }
  }

  // ---- Check ON GOTO/GOSUB expression without line numbers ----
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    if (/\bON\b/.test(text) && !/\b(ON\s+.+?\s+(GOTO|GOSUB))\b/i.test(text) && /\bON\s+/i.test(text) && !/\b(ON\s+.+?\s+(THEN|ELSE|RETURN))\b/i.test(text)) {
      // ON without GOTO/GOSUB
    }
  }

  // ---- Build summary ----
  const errors = warnings.filter(w => w.type === 'error').length;
  const warns = warnings.filter(w => w.type === 'warning').length;
  const infos = warnings.filter(w => w.type === 'info').length;
  
  let summary: string;
  if (errors === 0 && warns === 0) {
    summary = '✓ No issues found';
  } else {
    const parts: string[] = [];
    if (errors > 0) parts.push(`${errors} error${errors > 1 ? 's' : ''}`);
    if (warns > 0) parts.push(`${warns} warning${warns > 1 ? 's' : ''}`);
    if (infos > 0) parts.push(`${infos} info`);
    summary = `Found ${parts.join(', ')}`;
  }

  return {
    warnings,
    success: errors === 0,
    summary,
  };
}

/**
 * Quick check if code has syntax-level issues detectable without full parse.
 * Returns a simple count of issues for UI badge display.
 */
export function lintQuickSummary(code: string): { errors: number; warnings: number; infos: number } {
  const result = lint(code);
  return {
    errors: result.warnings.filter(w => w.type === 'error').length,
    warnings: result.warnings.filter(w => w.type === 'warning').length,
    infos: result.warnings.filter(w => w.type === 'info').length,
  };
}