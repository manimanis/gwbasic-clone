/**
 * GWBASIC Types - Shared types for lexer, parser, and interpreter
 */

// ============================================================================
// TOKEN TYPES
// ============================================================================

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',
  
  // Keywords
  PRINT = 'PRINT',
  INPUT = 'INPUT',
  LET = 'LET',
  IF = 'IF',
  THEN = 'THEN',
  ELSE = 'ELSE',
  FOR = 'FOR',
  TO = 'TO',
  STEP = 'STEP',
  NEXT = 'NEXT',
  WHILE = 'WHILE',
  WEND = 'WEND',
  DO = 'DO',
  LOOP = 'LOOP',
  UNTIL = 'UNTIL',
  GOSUB = 'GOSUB',
  RETURN = 'RETURN',
  GOTO = 'GOTO',
  ON = 'ON',
  GOTO_STMT = 'GOTO_STMT',
  GOSUB_STMT = 'GOSUB_STMT',
  END = 'END',
  REM = 'REM',
  DIM = 'DIM',
  ERASE = 'ERASE',
  DATA = 'DATA',
  READ = 'READ',
  RESTORE = 'RESTORE',
  CLS = 'CLS',
  LOCATE = 'LOCATE',
  COLOR = 'COLOR',
  SCREEN = 'SCREEN',
  CIRCLE = 'CIRCLE',
  LINE = 'LINE',
  PSET = 'PSET',
  PRESET = 'PRESET',
  PAINT = 'PAINT',
  DRAW = 'DRAW',
  PUT = 'PUT',
  GET = 'GET',
  SOUND = 'SOUND',
  PLAY = 'PLAY',
  RANDOMIZE = 'RANDOMIZE',
  TIMER = 'TIMER',
  CHAIN = 'CHAIN',
  LOAD = 'LOAD',
  SAVE = 'SAVE',
  FILES = 'FILES',
  KILL = 'KILL',
  NAME = 'NAME',
  OPEN = 'OPEN',
  CLOSE = 'CLOSE',
  INPUT_HASH = 'INPUT_HASH',
  OUTPUT = 'OUTPUT',
  APPEND = 'APPEND',
  RANDOM = 'RANDOM',
  BINARY = 'BINARY',
  AS = 'AS',
  FIELD = 'FIELD',
  PUT_FILE = 'PUT_FILE',
  GET_FILE = 'GET_FILE',
  WRITE = 'WRITE',
  WRITE_HASH = 'WRITE_HASH',
  PRINT_HASH = 'PRINT_HASH',
  LINE_INPUT = 'LINE_INPUT',
  LINE_INPUT_HASH = 'LINE_INPUT_HASH',
  ERROR = 'ERROR',
  RESUME = 'RESUME',
  CLEAR = 'CLEAR',
  RESET = 'RESET',
  WIDTH = 'WIDTH',
  WINDOW = 'WINDOW',
  VIEW = 'VIEW',
  PALETTE = 'PALETTE',
  PEN = 'PEN',
  WAIT = 'WAIT',
  KEY = 'KEY',
  INKEY = 'INKEY',
  ENVIRON = 'ENVIRON',
  SHELL = 'SHELL',
  SYSTEM = 'SYSTEM',
  CHDIR = 'CHDIR',
  MKDIR = 'MKDIR',
  RMDIR = 'RMDIR',
  DATE = 'DATE',
  TIME = 'TIME',
  USING = 'USING',
  MOD = 'MOD',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  XOR = 'XOR',
  SWAP = 'SWAP',
  EXIT = 'EXIT',
  SELECT = 'SELECT',
  CASE = 'CASE',
  DEF = 'DEF',
  FN = 'FN',
  
  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  POWER = 'POWER',
  MOD_OP = 'MOD_OP',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN = 'GREATER_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_EQUAL = 'GREATER_EQUAL',
  ASSIGN = 'ASSIGN',
  CONCAT = 'CONCAT',
  
  // Delimiters
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  COMMA = 'COMMA',
  SEMICOLON = 'SEMICOLON',
  COLON = 'COLON',
  HASH = 'HASH',
  DOLLAR = 'DOLLAR',
  PERCENT = 'PERCENT',
  EXCLAIM = 'EXCLAIM',
  DOT = 'DOT',
  
  // Special
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  UNKNOWN = 'UNKNOWN',
}

export interface Token {
  type: TokenType;
  value: string | number;
  line: number;
  column: number;
}

// ============================================================================
// AST NODES
// ============================================================================

export interface ASTNode {
  type: string;
  line?: number;
  col?: number;
}

export interface Program extends ASTNode {
  type: 'Program';
  statements: Statement[];
}

export interface Statement extends ASTNode {
  type: string;
}

export interface Expression extends ASTNode {
  type: string;
}

export interface NumberLiteral extends Expression {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral extends Expression {
  type: 'StringLiteral';
  value: string;
}

export interface Identifier extends Expression {
  type: 'Identifier';
  name: string;
}

export interface BinaryOp extends Expression {
  type: 'BinaryOp';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryOp extends Expression {
  type: 'UnaryOp';
  operator: string;
  operand: Expression;
}

export interface FunctionCall extends Expression {
  type: 'FunctionCall';
  name: string;
  args: Expression[];
}

export interface ArrayAccess extends Expression {
  type: 'ArrayAccess';
  name: string;
  indices: Expression[];
}

export interface PrintStatement extends Statement {
  type: 'PrintStatement';
  expressions: (Expression | string)[]; // string for TAB, COMMA, etc.
  fileNumber?: Expression;
  using?: Expression;
}

export interface InputStatement extends Statement {
  type: 'InputStatement';
  prompt?: Expression;
  variables: string[];
  fileNumber?: Expression;
  separator?: ';' | ',';
  lineInput?: boolean;
}

export interface LetStatement extends Statement {
  type: 'LetStatement';
  target: string | ArrayAccess;
  value: Expression;
}

export interface IfStatement extends Statement {
  type: 'IfStatement';
  condition: Expression;
  thenBranch: Statement[];
  elseBranch?: Statement[];
}

export interface ForStatement extends Statement {
  type: 'ForStatement';
  variable: string;
  start: Expression;
  end: Expression;
  step?: Expression;
}

export interface WhileStatement extends Statement {
  type: 'WhileStatement';
  condition: Expression;
}

export interface GosubStatement extends Statement {
  type: 'GosubStatement';
  label: number;
}

export interface ReturnStatement extends Statement {
  type: 'ReturnStatement';
}

export interface GotoStatement extends Statement {
  type: 'GotoStatement';
  label: number;
}

export interface EndStatement extends Statement {
  type: 'EndStatement';
}

export interface DimStatement extends Statement {
  type: 'DimStatement';
  arrays: Array<{ name: string; dimensions: Expression[] }>;
}

export interface DataStatement extends Statement {
  type: 'DataStatement';
  values: (number | string)[];
}

export interface ReadStatement extends Statement {
  type: 'ReadStatement';
  variables: string[];
}

export interface RestoreStatement extends Statement {
  type: 'RestoreStatement';
  label?: number;
}

export interface RemStatement extends Statement {
  type: 'RemStatement';
  comment: string;
}

export interface RandomizeStatement extends Statement {
  type: 'RandomizeStatement';
}

export interface ClsStatement extends Statement {
  type: 'ClsStatement';
}

export interface NextStatement extends Statement {
  type: 'NextStatement';
}

export interface WendStatement extends Statement {
  type: 'WendStatement';
}

export interface SwapStatement extends Statement {
  type: 'SwapStatement';
  var1: string;
  var2: string;
}

export interface DoLoopStatement extends Statement {
  type: 'DoLoopStatement';
  condition: Expression;
  conditionType: 'while' | 'until';
  position: 'start' | 'end';
  body: Statement[];
}

export interface ExitForStatement extends Statement {
  type: 'ExitForStatement';
}

export interface ExitWhileStatement extends Statement {
  type: 'ExitWhileStatement';
}

export interface ExitDoStatement extends Statement {
  type: 'ExitDoStatement';
}

export interface OnGotoStatement extends Statement {
  type: 'OnGotoStatement';
  expression: Expression;
  labels: number[];
}

export interface OnGosubStatement extends Statement {
  type: 'OnGosubStatement';
  expression: Expression;
  labels: number[];
}

export interface PrintUsingStatement extends Statement {
  type: 'PrintUsingStatement';
  format: Expression;
  expressions: Expression[];
}

export interface WriteStatement extends Statement {
  type: 'WriteStatement';
  expressions: Expression[];
}

export interface LocateStatement extends Statement {
  type: 'LocateStatement';
  row: Expression;
  column?: Expression;
}

export interface ColorStatement extends Statement {
  type: 'ColorStatement';
  foreground?: Expression;
  background?: Expression;
}

export interface EraseStatement extends Statement {
  type: 'EraseStatement';
  variables: string[];
}

export interface DefFnStatement extends Statement {
  type: 'DefFnStatement';
  name: string;
  params: string[];
  body: Expression;
}

export interface SelectCaseStatement extends Statement {
  type: 'SelectCaseStatement';
  expression: Expression;
  cases: Array<{ values: Expression[]; body: Statement[] }>;
  defaultCase?: Statement[];
}

export interface CaseElseStatement extends Statement {
  type: 'CaseElseStatement';
}

export interface EndSelectStatement extends Statement {
  type: 'EndSelectStatement';
}

export interface MidAssignStatement extends Statement {
  type: 'MidAssignStatement';
  stringVar: string;
  start: Expression;
  length: Expression;
  value: Expression;
}

// ============================================================================
// RUNTIME TYPES
// ============================================================================

export interface RuntimeValue {
  type: 'number' | 'string' | 'boolean' | 'null' | 'array';
  value: any;
}