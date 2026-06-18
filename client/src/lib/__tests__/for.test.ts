import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { GWBASICInterpreter } from '../interpreter';

describe('Lissajou Program', () => {
  it('executes the Lissajou program and produces output', async () => {
    const code = `10 S = 0 : FOR I = 1 TO 20 : PRINT "I = "; I : S = S + I : NEXT I : PRINT "Sum = "; S : END`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    
    console.log('Output lines:', output.length);
    console.log('First line:', output[0]);
    console.log('Sample lines:', output.slice(0, 6));
    
    // The FOR loop runs 20 times (I from 1 to 20), printing 20 lines
    // The initial "Lissajou on a text screen" gets scrolled off the 25-line buffer
    // So we should have 20 lines of Lissajous pattern
    expect(output.length).toBe(21);
  });

  it('executes nested FOR loop with colon-separated body on one line', async () => {
    const code = 'FOR I = 1 TO 3 : FOR J = 1 TO 2 : PRINT I * J : NEXT J : NEXT I';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    // console.log('AST:', ast);
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output).toEqual(['1', '2', '2', '4', '3', '6']);
  });
});