/**
 * Reproduction test for the INPUT/GOTO bug
 * Verifies that programs with line numbers execute in correct order
 */
import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { GWBASICInterpreter } from '../interpreter';

describe('Bug fixes - RANDOMIZE and INPUT ordering', () => {
  it('RANDOMIZE should be parsed as a valid statement with line number', async () => {
    const code = `30 RANDOMIZE`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0].type).toBe('RandomizeStatement');
    expect(ast.statements[0].line).toBe(30);
  });

  it('RANDOMIZE should not appear in AST as standalone statement when followed by valid statement', async () => {
    const code = `30 RANDOMIZE\n40 N = 5`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    expect(ast.statements.length).toBe(2);
    expect(ast.statements[0].type).toBe('RandomizeStatement');
    expect(ast.statements[0].line).toBe(30);
    expect(ast.statements[1].type).toBe('LetStatement');
    expect(ast.statements[1].line).toBe(40);
  });

  it('should print header lines before reaching INPUT', async () => {
    const code = `10 PRINT "Guess the Number!"
20 PRINT "I'm thinking of a number between 1 and 100"
30 RANDOMIZE
40 N = INT(RND * 100) + 1
50 T = 0
60 PRINT N
70 INPUT "Your Guess"; G`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    let inputResolve: (value: string) => void = () => {};
    const inputPromise = new Promise<string>(resolve => { inputResolve = resolve; });
    
    const interpreter = new GWBASICInterpreter();
    interpreter.setInputCallback(async (_prompt: string) => {
      return inputPromise;
    });
    
    // Execute and resolve input after a brief delay
    const execPromise = interpreter.execute(ast);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Output should already contain headers before INPUT blocks
    const midOutput = interpreter.getOutput();
    expect(midOutput[0]).toBe('Guess the Number!');
    expect(midOutput[1]).toBe("I'm thinking of a number between 1 and 100");
    
    inputResolve('50');
    await execPromise;
  });

  it('should parse a full guess-the-number program correctly', async () => {
    const code = `10 PRINT "Guess the Number!"
20 PRINT "I'm thinking of a number between 1 and 100"
30 RANDOMIZE
40 N = INT(RND * 100) + 1
50 T = 0
60 INPUT "Your Guess"; G
70 T = T + 1
80 IF G = N THEN PRINT "Correct in"; T; "tries!": END
90 IF G > N THEN PRINT "Too high!" ELSE PRINT "Too low!"
100 GOTO 60`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    // Verify all statements are parsed with correct line numbers
    // Line 80 has colon-separated statements: PRINT and END (END is in IF's thenBranch)
    expect(ast.statements.length).toBe(10);
    expect(ast.statements[0].line).toBe(10);
    expect(ast.statements[1].line).toBe(20);
    expect(ast.statements[2].line).toBe(30);
    expect(ast.statements[2].type).toBe('RandomizeStatement');
    expect(ast.statements[3].line).toBe(40);
    expect(ast.statements[4].line).toBe(50);
    expect(ast.statements[5].line).toBe(60);
    expect(ast.statements[5].type).toBe('InputStatement');
    expect(ast.statements[9].type).toBe('GotoStatement');
    expect(ast.statements[9].line).toBe(100);
  });

  // ────────────── GOSUB / REM / getTargetPc bug ──────────────

  it('GOSUB to a line after a REM should execute the target subroutine', async () => {
    const code = `10 GOSUB 100
20 PRINT "AFTER"
30 END
100 PRINT "SUB"
110 RETURN`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output[0]).toBe('SUB');
    expect(output[1]).toBe('AFTER');
  });

  it('GOSUB to a line number that lands on a REM should execute the first non-REM statement after it', async () => {
    const code = `10 GOSUB 1000
20 PRINT "DONE"
30 END
1000 REM My subroutine
1010 PRINT "IN SUB"
1020 RETURN`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output[0]).toBe('IN SUB');
    expect(output[1]).toBe('DONE');
  });

  it('GOSUB/RETURN with FOR loop inside subroutine completes all iterations', async () => {
    const code = `10 GOSUB 100
20 PRINT "DONE"
30 END
100 FOR I = 0 TO 3
110 PRINT I
120 NEXT I
130 RETURN`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output[0]).toBe('0');
    expect(output[1]).toBe('1');
    expect(output[2]).toBe('2');
    expect(output[3]).toBe('3');
    expect(output[4]).toBe('DONE');
    expect(output.length).toBe(5);
  });

  it('GOSUB to an unknown line number should throw an error', async () => {
    const code = `10 GOSUB 999
20 PRINT "AFTER"
30 END`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    // Should output an error message instead of crashing
    const output = interpreter.getOutput();
    const text = output.join(' ');
    expect(text).toContain('ERROR');
    expect(text).toContain('999');
  });

  it('GOTO to a line after a REM should jump correctly', async () => {
    const code = `10 PRINT "START"
20 GOTO 1000
30 PRINT "SKIP"
40 END
1000 REM Jump target
1010 PRINT "JUMPED"
1020 END`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output[0]).toBe('START');
    expect(output[1]).toBe('JUMPED');
    expect(output.length).toBe(2);
  });

  it('FOR loop with GOSUB inside body works correctly', async () => {
    const code = `10 FOR I = 0 TO 2
20 GOSUB 100
30 NEXT I
40 END
100 PRINT "SUB"
110 RETURN`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output[0]).toBe('SUB');
    expect(output[1]).toBe('SUB');
    expect(output[2]).toBe('SUB');
    expect(output.length).toBe(3);
  });

  it('full program with array, GOSUB, FOR loops and REM completes without overflow', async () => {
    const code = `10 CLS
20 DIM A(5)
30 GOSUB 1000
40 GOSUB 2000
50 END
1000 REM Fill array
1010 FOR I = 0 TO 5
1020 A(I) = I * 10
1030 NEXT I
1040 RETURN
2000 REM Print array
2010 FOR I = 0 TO 5
2020 PRINT A(I)
2030 NEXT I
2040 RETURN`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output[0]).toBe('0');
    expect(output[1]).toBe('10');
    expect(output[2]).toBe('20');
    expect(output[3]).toBe('30');
    expect(output[4]).toBe('40');
    expect(output[5]).toBe('50');
    expect(output.length).toBe(6);
  });
});
