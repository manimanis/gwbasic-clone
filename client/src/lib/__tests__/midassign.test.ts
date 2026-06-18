import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { GWBASICInterpreter } from '../interpreter';

async function runProgram(code: string): Promise<string[]> {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const interpreter = new GWBASICInterpreter();
  await interpreter.execute(ast);
  return interpreter.getOutput();
}

describe('MID$ Assignment', () => {
  it('supports MID$ assignment to modify string', async () => {
    const output = await runProgram('A$ = "Hello"\nMID$(A$, 2, 3) = "XXX"\nPRINT A$');
    expect(output[0]).toBe('HXXXo');
  });

  it('supports MID$ assignment at position 1', async () => {
    const output = await runProgram('A$ = "Hello"\nMID$(A$, 1, 1) = "J"\nPRINT A$');
    expect(output[0]).toBe('Jello');
  });

  it('supports MID$ assignment at end of string', async () => {
    const output = await runProgram('A$ = "Hello"\nMID$(A$, 5, 1) = "!"\nPRINT A$');
    expect(output[0]).toBe('Hell!');
  });

  it('supports MID$ assignment with variable length', async () => {
    const output = await runProgram('A$ = "Hello"\nL = 2\nMID$(A$, 2, L) = "XX"\nPRINT A$');
    expect(output[0]).toBe('HXXlo');
  });

  it('supports MID$ assignment in a loop', async () => {
    const code = `
      A$ = "Hello"
      FOR I = 1 TO 3
        MID$(A$, I, 1) = "X"
      NEXT I
      PRINT A$
    `;
    const output = await runProgram(code);
    expect(output[0]).toBe('XXXlo');
  });
});