/**
 * Tests for GWBASIC Lexer
 */
import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer';
import { TokenType } from '../types';

describe('Lexer', () => {
  it('tokenizes a number', () => {
    const lexer = new Lexer('123');
    const tokens = lexer.tokenize();
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].value).toBe(123);
  });

  it('tokenizes a string', () => {
    const lexer = new Lexer('"Hello"');
    const tokens = lexer.tokenize();
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('Hello');
  });

  it('tokenizes PRINT keyword', () => {
    const lexer = new Lexer('PRINT');
    const tokens = lexer.tokenize();
    expect(tokens[0].type).toBe(TokenType.PRINT);
  });

  it('tokenizes a variable assignment', () => {
    const lexer = new Lexer('X=5');
    const tokens = lexer.tokenize();
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].value).toBe('X');
    expect(tokens[1].type).toBe(TokenType.ASSIGN);
    expect(tokens[2].type).toBe(TokenType.NUMBER);
    expect(tokens[2].value).toBe(5);
  });

  it('tokenizes a simple PRINT statement', () => {
    const lexer = new Lexer('10 PRINT "Hello World"');
    const tokens = lexer.tokenize();
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].value).toBe(10);
    expect(tokens[1].type).toBe(TokenType.PRINT);
    expect(tokens[2].type).toBe(TokenType.STRING);
    expect(tokens[2].value).toBe('Hello World');
  });

  it('handles REM comments', () => {
    const lexer = new Lexer('REM This is a comment\nPRINT 5');
    const tokens = lexer.tokenize();
    // REM should be skipped, only PRINT 5 should be tokenized
    expect(tokens[0].type).toBe(TokenType.NEWLINE);
    expect(tokens[1].type).toBe(TokenType.PRINT);
    expect(tokens[2].type).toBe(TokenType.NUMBER);
  });
});