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

describe('MID$ Assignment Verification', () => {
  it('exact case from user feedback: A$ = "Hello", MID$(A$, 2, 3) = "XXX"', async () => {
    const output = await runProgram('10 A$ = "Hello"\n20 MID$(A$, 2, 3) = "XXX"\n30 PRINT A$\n40 END');
    // console.log('Output:', output);
    expect(output[0]).toBe('HXXXo');
  });

  it('simpler case without line numbers', async () => {
    const output = await runProgram('A$ = "Hello"\nMID$(A$, 2, 3) = "XXX"\nPRINT A$');
    // console.log('Output:', output);
    expect(output[0]).toBe('HXXXo');
  });
});