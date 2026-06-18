/**
 * GWBASIC Interpreter - Main entry point (re-exports from split modules)
 * 
 * This file was split into separate modules for better maintainability:
 * - types.ts: All type definitions (TokenType, AST nodes, RuntimeValue)
 * - lexer.ts: Lexer class for tokenization
 * - parser.ts: Parser class for AST construction
 * - interpreter.ts: GWBASICInterpreter class for execution
 * 
 * All exports are re-exported here for backward compatibility.
 */

export { TokenType, type Token, type ASTNode, type Program, type Statement, type Expression, type RuntimeValue } from './types';
export type {
  NumberLiteral,
  StringLiteral,
  Identifier,
  BinaryOp,
  UnaryOp,
  FunctionCall,
  ArrayAccess,
  PrintStatement,
  InputStatement,
  LetStatement,
  IfStatement,
  ForStatement,
  WhileStatement,
  GosubStatement,
  ReturnStatement,
  GotoStatement,
  EndStatement,
  DimStatement,
  DataStatement,
  ReadStatement,
  RestoreStatement,
  RemStatement,
  RandomizeStatement,
} from './types';

export { Lexer } from './lexer';
export { Parser } from './parser';
export { GWBASICInterpreter, type TerminalCell, type StepInfo, type StepCallback } from './interpreter';
