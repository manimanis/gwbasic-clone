/**
 * Tests for GWBASIC Parser
 */
import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer';
import { Parser } from '../parser';

describe('Parser', () => {
  it('parses a PRINT statement', () => {
    const lexer = new Lexer('PRINT "Hello"');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.type).toBe('Program');
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].type).toBe('PrintStatement');
  });

  it('parses a LET assignment', () => {
    const lexer = new Lexer('LET X = 42');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].type).toBe('LetStatement');
  });

  it('parses a simple program with line numbers', () => {
    const lexer = new Lexer('10 PRINT "Hello"\n20 PRINT "World"');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.statements.length).toBe(2);
    expect(ast.statements[0].type).toBe('PrintStatement');
    expect(ast.statements[1].type).toBe('PrintStatement');
  });

  it('parses IF-THEN statement', () => {
    const lexer = new Lexer('IF X = 5 THEN PRINT "Yes"');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].type).toBe('IfStatement');
  });

  it('parses FOR loop', () => {
    const lexer = new Lexer('FOR I = 1 TO 10\nPRINT I\nNEXT I');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].type).toBe('ForStatement');
  });

  it('parses WHILE loop', () => {
    const lexer = new Lexer('WHILE I <= 5\nPRINT I\nWEND');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].type).toBe('WhileStatement');
  });

  it('parses GOTO statement', () => {
    const lexer = new Lexer('GOTO 100');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].type).toBe('GotoStatement');
  });

  it('parses an expression with operators', () => {
    const lexer = new Lexer('X = 5 + 3 * 2');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].type).toBe('LetStatement');
  });
});