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
});