/**
 * GWBASIC Constants - Centralized list of keywords, functions, and operators
 * Used by both the interpreter engine and the editor for syntax highlighting
 */

export const GWBASIC_KEYWORDS = [
  'PRINT', 'INPUT', 'LET', 'IF', 'THEN', 'ELSE', 'FOR', 'TO', 'STEP', 'NEXT',
  'WHILE', 'WEND', 'GOSUB', 'RETURN', 'GOTO', 'END', 'REM', 'DIM', 'ERASE',
  'DATA', 'READ', 'RESTORE', 'CLS', 'LOCATE', 'COLOR', 'SCREEN', 'CIRCLE',
  'LINE', 'PSET', 'PRESET', 'PAINT', 'DRAW', 'PUT', 'GET', 'SOUND', 'PLAY',
  'RANDOMIZE', 'CHAIN', 'LOAD', 'SAVE', 'FILES', 'KILL', 'NAME',
  'OPEN', 'CLOSE', 'FIELD', 'WRITE', 'ERROR', 'RESUME', 'CLEAR', 'RESET',
  'WIDTH', 'WINDOW', 'VIEW', 'PALETTE', 'PEN', 'WAIT', 'KEY', 'ENVIRON',
  'SHELL', 'SYSTEM', 'CHDIR', 'MKDIR', 'RMDIR', 'DATE', 'TIME', 'USING',
  'MOD', 'AND', 'OR', 'NOT', 'XOR', 'AS', 'SWAP', 'DO', 'LOOP', 'UNTIL',
  'EXIT', 'ON', 'SELECT', 'CASE', 'END', 'DEF', 'FN', 'LINE', 'INPUT',
];

export const GWBASIC_FUNCTIONS = [
  'ABS', 'SIN', 'COS', 'TAN', 'ATN', 'ATAN2', 'EXP', 'LOG', 'SQR', 'INT', 'FIX', 'SGN',
  'RND', 'CINT', 'CDBL', 'CSNG', 'LEN', 'ASC', 'CHR$', 'STR$', 'VAL', 'LEFT$',
  'RIGHT$', 'MID$', 'INSTR', 'UPPER$', 'LOWER$', 'SPACE$', 'STRING$', 'HEX$',
  'OCT$', 'TRIM$', 'LTRIM$', 'RTRIM$', 'REPEAT$', 'REVERSE$',
  'TAB', 'SPC', 'TIMER', 'DATE$', 'TIME$', 'INKEY$',
  'MKI$', 'MKS$', 'MKD$', 'CVI', 'CVS', 'CVD',
  'EOF', 'LOC', 'LPOS', 'POS', 'CSRLIN', 'POINT', 'SCREEN', 'INPUT$', 'ENVIRON$',
  'PEEK', 'FRE', 'ERL', 'ERR', 'FREEFILE', 'PMAP', 'LOF',
  'MIN', 'MAX', 'MOYAR', 'MOYPO', 'ARRPROCH', 'CEIL', 'FLOOR',
  'SUM', 'PROD', 'MEDIAN', 'STD',
  'MKDATE', 'YEAR', 'MONTH', 'DAY', 'DAYW', 'HOUR', 'MINUTE', 'SECONDS',
  'DATESTR$', 'TODATE', 'DEGTORAD', 'RADTODEG',
];

  export const GWBASIC_NOARG_FUNCTIONS = ['RND', 'TIMER', 'DATE$', 'TIME$', 'INKEY$', 'PEEK', 'FRE', 'POS', 'CSRLIN', 'ERL', 'ERR', 'MKDATE', 'DATESTR$'];

export const GWBASIC_GOTO_LIKE_KEYWORDS = ['GOTO', 'GOSUB'];