/**
 * Test for Bubble Sort program
 */
import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { GWBASICInterpreter } from '../interpreter';

describe('Bubble Sort', () => {
  it('parses and executes the Bubble Sort program', async () => {
    const code = `10 DIM A(9)
20 FOR I = 1 TO 9: A(I) = INT(RND * 100): NEXT I
30 PRINT "Before:"
40 FOR I = 1 TO 9: PRINT A(I);: NEXT I
50 PRINT ""
60 FOR I = 1 TO 8
70 FOR J = 1 TO 9 - I
80 IF A(J) > A(J + 1) THEN T = A(J): A(J) = A(J + 1): A(J + 1) = T
90 NEXT J
100 NEXT I
110 PRINT "After:"
120 FOR I = 1 TO 9: PRINT A(I);: NEXT I
130 PRINT ""`;

    // Test parsing
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe('Program');
    expect(ast.statements.length).toBe(9);

    // Test execution
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    
    const output = interpreter.getOutput();
    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toBe('Before:');
    // After the sort, there should be "After:" in the output
    expect(output.some(line => line.includes('After:'))).toBe(true);
  });

  it('parses multi-statement lines with colon', () => {
    const lexer = new Lexer('A = 1: B = 2: PRINT A + B');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.statements.length).toBe(3);
  });

  it('parses FOR loop with colon-separated body', () => {
    const lexer = new Lexer('FOR I = 1 TO 3: PRINT I: NEXT I');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].type).toBe('ForStatement');
  });
});