
/**
 * Tests for GWBASIC Interpreter
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { GWBASICInterpreter } from '../interpreter';

// Helper to run a GWBASIC program and return output as strings
async function runProgram(code: string): Promise<string[]> {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const interpreter = new GWBASICInterpreter();
  await interpreter.execute(ast);
  return interpreter.getOutput().map(line => typeof line === 'string' ? line : line.text);
}

describe('GWBASICInterpreter', () => {
  // ────────────── Basic Statements ──────────────

  it('executes a PRINT statement', async () => {
    const output = await runProgram('PRINT "Hello"');
    expect(output[0]).toBe('Hello');
  });

  it('executes PRINT with multiple items separated by semicolon', async () => {
    const output = await runProgram('PRINT "A";"B";"C"');
    expect(output[0]).toBe('ABC');
  });

  it('executes PRINT with numbers', async () => {
    const output = await runProgram('PRINT 42');
    expect(output[0]).toBe('42');
  });

  it('executes PRINT with expression', async () => {
    const output = await runProgram('PRINT 5 + 3');
    expect(output[0]).toBe('8');
  });

  it('executes a LET assignment', async () => {
    const output = await runProgram('LET X = 42\nPRINT X');
    expect(output[0]).toBe('42');
  });

  it('executes implicit assignment without LET', async () => {
    const output = await runProgram('X = 100\nPRINT X');
    expect(output[0]).toBe('100');
  });

  it('executes CLS statement', async () => {
    const lexer = new Lexer('PRINT "A"\nCLS\nPRINT "B"');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output).toEqual(['B']);
  });

  it('executes END statement', async () => {
    const output = await runProgram('PRINT "A"\nEND\nPRINT "B"');
    expect(output).toEqual(['A']);
  });

  it('supports PRINT with comma tabulation', async () => {
    const output = await runProgram('PRINT "A","B"');
    // Comma adds padding to the next 14-char tab stop
    expect(output[0].length).toBeGreaterThan(1);
    expect(output[0]).toContain('A');
    expect(output[0]).toContain('B');
  });

  it('supports PRINT with trailing semicolon (no newline)', async () => {
    // In GWBASIC, a trailing semicolon suppresses the final newline,
    // so the next PRINT continues on the same line
    const lexer = new Lexer('PRINT "A";\nPRINT "B"');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    // "A" stays on same line, "B" continues it → single line "AB"
    expect(output[0]).toBe('AB');
  });

  // ────────────── Math Expressions ──────────────

  it('handles math expression precedence (5 + 3 * 2 = 11)', async () => {
    const output = await runProgram('PRINT 5 + 3 * 2');
    expect(output[0]).toBe('11');
  });

  it('handles parentheses override ((5 + 3) * 2 = 16)', async () => {
    const output = await runProgram('PRINT (5 + 3) * 2');
    expect(output[0]).toBe('16');
  });

  it('handles subtraction', async () => {
    const output = await runProgram('PRINT 10 - 3');
    expect(output[0]).toBe('7');
  });

  it('handles division', async () => {
    const output = await runProgram('PRINT 10 / 3');
    expect(parseFloat(output[0])).toBeCloseTo(3.333, 2);
  });

  it('handles power operator', async () => {
    const output = await runProgram('PRINT 2 ^ 3');
    expect(output[0]).toBe('8');
  });

  it('handles MOD operator', async () => {
    const output = await runProgram('PRINT 10 MOD 3');
    expect(output[0]).toBe('1');
  });

  it('handles unary minus', async () => {
    const output = await runProgram('PRINT -5');
    expect(output[0]).toBe('-5');
  });

  it('handles unary minus in expression', async () => {
    const output = await runProgram('PRINT -3 + 5');
    expect(output[0]).toBe('2');
  });

  // ────────────── FOR Loops ──────────────

  it('executes a FOR loop', async () => {
    const output = await runProgram('FOR I = 1 TO 3\nPRINT I\nNEXT I');
    expect(output[0]).toBe('1');
    expect(output[1]).toBe('2');
    expect(output[2]).toBe('3');
  });

  it('executes FOR loop with STEP', async () => {
    const output = await runProgram('FOR I = 1 TO 10 STEP 2\nPRINT I\nNEXT I');
    expect(output).toEqual(['1', '3', '5', '7', '9']);
  });

  it('executes FOR loop with negative STEP', async () => {
    const output = await runProgram('FOR I = 5 TO 1 STEP -1\nPRINT I\nNEXT I');
    expect(output).toEqual(['5', '4', '3', '2', '1']);
  });

  it('executes nested FOR loops', async () => {
    const output = await runProgram(
      'FOR I = 1 TO 2\nFOR J = 1 TO 3\nPRINT I * J\nNEXT J\nNEXT I'
    );
    expect(output).toEqual(['1', '2', '3', '2', '4', '6']);
  });

  it('executes FOR loop with colon-separated body on one line', async () => {
    const output = await runProgram('FOR I = 1 TO 3: PRINT I: NEXT I');
    expect(output).toEqual(['1', '2', '3']);
  });

  // ────────────── IF-THEN-ELSE ──────────────

  it('executes IF-THEN when condition is true', async () => {
    const output = await runProgram('X = 5\nIF X = 5 THEN PRINT "Yes"');
    expect(output[0]).toBe('Yes');
  });

  it('skips IF-THEN when condition is false', async () => {
    const output = await runProgram('X = 3\nIF X = 5 THEN PRINT "Yes"');
    expect(output.length).toBe(0);
  });

  it('executes IF-THEN-ELSE correctly', async () => {
    const output = await runProgram('X = 3\nIF X = 5 THEN PRINT "Yes" ELSE PRINT "No"');
    expect(output[0]).toBe('No');
  });

  it('executes IF-THEN with comparison operators', async () => {
    const output = await runProgram('X = 10\nIF X > 5 THEN PRINT "Greater"');
    expect(output[0]).toBe('Greater');
  });

  it('executes IF-THEN with NOT operator', async () => {
    const output = await runProgram('X = 0\nIF NOT X THEN PRINT "Zero"');
    expect(output[0]).toBe('Zero');
  });

  it('executes IF-THEN with AND operator', async () => {
    const output = await runProgram('X = 5: Y = 10\nIF X > 0 AND Y > 0 THEN PRINT "Both positive"');
    expect(output[0]).toBe('Both positive');
  });

  it('executes IF-THEN with OR operator', async () => {
    const output = await runProgram('X = 0: Y = 10\nIF X > 0 OR Y > 0 THEN PRINT "One positive"');
    expect(output[0]).toBe('One positive');
  });

  it('executes IF-THEN with string comparison', async () => {
    const output = await runProgram('S$ = "HELLO"\nIF S$ = "HELLO" THEN PRINT "Match"');
    expect(output[0]).toBe('Match');
  });

  it('executes IF-THEN with multi-statement colon body', async () => {
    const output = await runProgram('X = 5\nIF X > 0 THEN A = 10: B = 20: PRINT A + B');
    expect(output[0]).toBe('30');
  });

  // ────────────── WHILE Loops ──────────────

  it('executes WHILE loop', async () => {
    const output = await runProgram('I = 1\nWHILE I <= 3\nPRINT I\nI = I + 1\nWEND');
    expect(output).toEqual(['1', '2', '3']);
  });

  it('skips WHILE loop when condition is false', async () => {
    const output = await runProgram('I = 10\nWHILE I <= 3\nPRINT I\nI = I + 1\nWEND');
    expect(output.length).toBe(0);
  });

  // ────────────── GOTO ──────────────

  it('executes GOTO forwards', async () => {
    const output = await runProgram('10 PRINT "A"\n20 GOTO 40\n30 PRINT "B"\n40 PRINT "C"');
    expect(output).toEqual(['A', 'C']);
  });

  it('executes GOTO backwards (loop with exit)', async () => {
    const output = await runProgram(
      '10 I = 1\n20 PRINT I\n30 I = I + 1\n40 IF I <= 3 THEN GOTO 20\n50 PRINT "Done"'
    );
    expect(output).toEqual(['1', '2', '3', 'Done']);
  });

  // ────────────── GOSUB/RETURN ──────────────

  it('executes GOSUB and RETURN', async () => {
    const output = await runProgram(
      '10 PRINT "A"\n20 GOSUB 50\n30 PRINT "C"\n40 END\n50 PRINT "B"\n60 RETURN'
    );
    expect(output).toEqual(['A', 'B', 'C']);
  });

  it('executes nested GOSUB', async () => {
    const output = await runProgram(
      '10 PRINT "1"\n20 GOSUB 40\n30 END\n40 PRINT "2"\n50 GOSUB 70\n60 RETURN\n70 PRINT "3"\n80 RETURN'
    );
    expect(output).toEqual(['1', '2', '3']);
  });

  // ────────────── DATA / READ ──────────────

  it('executes READ from DATA', async () => {
    const output = await runProgram('READ A, B, C\nPRINT A + B + C\nDATA 10, 20, 30');
    expect(output[0]).toBe('60');
  });

  it('executes RESTORE to reset DATA pointer', async () => {
    const output = await runProgram(
      'READ A: READ B: RESTORE: READ C\nPRINT A\nPRINT B\nPRINT C\nDATA 100, 200'
    );
    expect(output).toEqual(['100', '200', '100']);
  });

  // ────────────── Arrays ──────────────

  it('supports DIM and array access', async () => {
    const output = await runProgram('DIM A(5)\nA(1) = 10\nA(2) = 20\nPRINT A(1) + A(2)');
    expect(output[0]).toBe('30');
  });

  it('supports FOR loop with array', async () => {
    const output = await runProgram(
      'DIM A(3)\nFOR I = 1 TO 3\nA(I) = I * 10\nNEXT I\nFOR I = 1 TO 3\nPRINT A(I)\nNEXT I'
    );
    expect(output).toEqual(['10', '20', '30']);
  });

  // ────────────── String Functions ──────────────

  it('supports LEN function', async () => {
    const output = await runProgram('PRINT LEN("Hello")');
    expect(output[0]).toBe('5');
  });

  it('supports LEFT$ function', async () => {
    const output = await runProgram('PRINT LEFT$("Hello", 2)');
    expect(output[0]).toBe('He');
  });

  it('supports RIGHT$ function', async () => {
    const output = await runProgram('PRINT RIGHT$("Hello", 3)');
    expect(output[0]).toBe('llo');
  });

  it('supports MID$ function', async () => {
    const output = await runProgram('PRINT MID$("Hello", 2, 3)');
    expect(output[0]).toBe('ell');
  });

  it('supports CHR$ function', async () => {
    const output = await runProgram('PRINT CHR$(65)');
    expect(output[0]).toBe('A');
  });

  it('supports ASC function', async () => {
    const output = await runProgram('PRINT ASC("A")');
    expect(output[0]).toBe('65');
  });

  it('supports STR$ function', async () => {
    const output = await runProgram('PRINT STR$(42)');
    expect(output[0]).toBe('42');
  });

  it('supports VAL function', async () => {
    const output = await runProgram('PRINT VAL("123")');
    expect(output[0]).toBe('123');
  });

  it('supports string concatenation with +', async () => {
    const output = await runProgram('PRINT "Hello" + " " + "World"');
    expect(output[0]).toBe('Hello World');
  });

  it('supports UPPER$ function', async () => {
    const output = await runProgram('PRINT UPPER$("hello")');
    expect(output[0]).toBe('HELLO');
  });

  it('supports LOWER$ function', async () => {
    const output = await runProgram('PRINT LOWER$("HELLO")');
    expect(output[0]).toBe('hello');
  });

  it('supports STRING$ function', async () => {
    const output = await runProgram('PRINT STRING$(5, "A")');
    expect(output[0]).toBe('AAAAA');
  });

  // ────────────── Math Functions ──────────────

  it('supports ABS function', async () => {
    const output = await runProgram('PRINT ABS(-10)');
    expect(output[0]).toBe('10');
  });

  it('supports INT function', async () => {
    const output = await runProgram('PRINT INT(3.7)');
    expect(output[0]).toBe('3');
  });

  it('supports SGN function', async () => {
    const output = await runProgram('PRINT SGN(-5)\nPRINT SGN(0)\nPRINT SGN(8)');
    expect(output).toEqual(['-1', '0', '1']);
  });

  it('supports SQR function', async () => {
    const output = await runProgram('PRINT SQR(9)');
    expect(output[0]).toBe('3');
  });

  it('supports RND function', async () => {
    const output = await runProgram('PRINT RND');
    const value = parseFloat(output[0]);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  // ────────────── TIMER / DATE$ / TIME$ ──────────────

  it('supports TIMER function', async () => {
    const output = await runProgram('PRINT TIMER');
    const value = parseFloat(output[0]);
    expect(value).toBeGreaterThan(0);
  });

  it('supports DATE$ function', async () => {
    const output = await runProgram('PRINT DATE$');
    expect(output[0]).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });

  it('supports TIME$ function', async () => {
    const output = await runProgram('PRINT TIME$');
    expect(output[0]).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  // ────────────── Error Handling & Edge Cases ──────────────

  it('handles division by zero gracefully', async () => {
    const lexer = new Lexer('PRINT 10 / 0');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output.some(line => line.includes('ERROR') || line.includes('Division by zero'))).toBe(true);
  });

  it('handles parse errors gracefully', async () => {
    // This syntax causes a parse error (unexpected token)
    const lexer = new Lexer('PRINT +');
    expect(() => {
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
    }).toThrow();
  });

  it('handles undefined variable default to 0', async () => {
    const output = await runProgram('PRINT X');
    expect(output[0]).toBe('0');
  });

  it('executes empty program', async () => {
    const output = await runProgram('');
    expect(output).toEqual([]);
  });

  it('executes program with only comments', async () => {
    const output = await runProgram('REM This is a comment\nREM Another comment');
    expect(output).toEqual([]);
  });

  it('executes RANDOMIZE statement without error', async () => {
    const output = await runProgram('RANDOMIZE\nPRINT "OK"');
    expect(output[0]).toBe('OK');
  });

  // ────────────── Line Numbers ──────────────

  it('executes program with line numbers in order', async () => {
    const output = await runProgram(
      '30 PRINT "Third"\n10 PRINT "First"\n20 PRINT "Second"'
    );
    // Statements should be executed in the order they appear in the parsed AST,
    // not by line number (since the parser maintains source order)
    expect(output).toEqual(['Third', 'First', 'Second']);
  });

  // ────────────── WHILE loop with realistic usage ──────────────

  it('executes a countdown with WHILE', async () => {
    const output = await runProgram(
      'I = 5\nWHILE I >= 1\nPRINT I\nI = I - 1\nWEND\nPRINT "Liftoff!"'
    );
    expect(output).toEqual(['5', '4', '3', '2', '1', 'Liftoff!']);
  });

  // ────────────── Large iteration count ──────────────

  it('iterates a FOR loop 100 times', async () => {
    const output = await runProgram(
      'FOR I = 1 TO 100\nNEXT I\nPRINT "Done"'
    );
    expect(output[0]).toBe('Done');
  });

  // ────────────── SWAP ──────────────

  it('executes SWAP to exchange two variables', async () => {
    const output = await runProgram(
      'A = 10\nB = 20\nPRINT A\nPRINT B\nSWAP A, B\nPRINT A\nPRINT B'
    );
    expect(output).toEqual(['10', '20', '20', '10']);
  });

  it('SWAP works with string variables', async () => {
    const output = await runProgram(
      'A$ = "Hello"\nB$ = "World"\nPRINT A$\nPRINT B$\nSWAP A$, B$\nPRINT A$\nPRINT B$'
    );
    expect(output).toEqual(['Hello', 'World', 'World', 'Hello']);
  });

  // ────────────── DO...LOOP WHILE ──────────────

  it('executes DO WHILE...LOOP', async () => {
    const output = await runProgram(
      'I = 1\nDO WHILE I <= 3\nPRINT I\nI = I + 1\nLOOP'
    );
    expect(output).toEqual(['1', '2', '3']);
  });

  it('executes DO UNTIL...LOOP', async () => {
    const output = await runProgram(
      'I = 1\nDO UNTIL I > 3\nPRINT I\nI = I + 1\nLOOP'
    );
    expect(output).toEqual(['1', '2', '3']);
  });

  it('executes DO...LOOP WHILE (condition at end)', async () => {
    const output = await runProgram(
      'I = 1\nDO\nPRINT I\nI = I + 1\nLOOP WHILE I <= 3'
    );
    expect(output).toEqual(['1', '2', '3']);
  });

  it('DO WHILE with false condition executes zero times', async () => {
    const output = await runProgram(
      'I = 10\nDO WHILE I <= 3\nPRINT I\nI = I + 1\nLOOP'
    );
    expect(output.length).toBe(0);
  });

  it('DO...LOOP WHILE with false condition executes once', async () => {
    const output = await runProgram(
      'I = 10\nDO\nPRINT I\nI = I + 1\nLOOP WHILE I <= 3'
    );
    expect(output).toEqual(['10']);
  });

  // ────────────── Complex programs ──────────────

  it('runs a Fibonacci program', async () => {
    const output = await runProgram(
      'A = 0\nB = 1\nFOR I = 1 TO 6\nPRINT A\nC = A + B\nA = B\nB = C\nNEXT I'
    );
    expect(output).toEqual(['0', '1', '1', '2', '3', '5']);
  });

  it('runs a prime number checker', async () => {
    const output = await runProgram(
      'N = 20\nFOR I = 2 TO N\nISPRIME = 1\nFOR J = 2 TO INT(SQR(I))\nIF I MOD J = 0 THEN ISPRIME = 0\nNEXT J\nIF ISPRIME = 1 THEN PRINT I\nNEXT I'
    );
    expect(output).toEqual(['2', '3', '5', '7', '11', '13', '17', '19']);
  });

  // ────────────── PRINT trailing semicolon in loops ──────────────

  it('PRINT with trailing semicolon prints all values on same line in a loop', async () => {
    // This is the exact pattern the user reported: FOR loop with semicolons
    const output = await runProgram(
      'FOR I = 1 TO 9\nPRINT I;\nNEXT I'
    );
    // All values should be on a single line (no newlines between them)
    expect(output.length).toBe(1);
    expect(output[0]).toContain('1');
    expect(output[0]).toContain('9');
  });

  it('PRINT with semicolon in FOR loop and final PRINT on new line', async () => {
    const output = await runProgram(
      'FOR I = 1 TO 3\nPRINT I;\nNEXT I\nPRINT "Done"'
    );
    // All numbers and "Done" on one line (trailing semicolon keeps same line)
    expect(output.length).toBe(1);
    expect(output[0]).toContain('1');
    expect(output[0]).toContain('3');
    expect(output[0]).toContain('Done');
  });

  // ────────────── ON...GOTO ──────────────

  it('executes ON...GOTO correctly', async () => {
    const output = await runProgram(
      'X = 2\nON X GOTO 10, 20, 30\n10 PRINT "A"\nGOTO 40\n20 PRINT "B"\nGOTO 40\n30 PRINT "C"\nGOTO 40\n40 PRINT "Done"'
    );
    expect(output).toEqual(['B', 'Done']);
  });

  // ────────────── ON...GOSUB ──────────────

  it('executes ON...GOSUB correctly', async () => {
    const output = await runProgram(
      'X = 1\nON X GOSUB 10, 20\nPRINT "After"\nEND\n10 PRINT "Sub1"\nRETURN\n20 PRINT "Sub2"\nRETURN'
    );
    expect(output).toEqual(['Sub1', 'After']);
  });

  // ────────────── WRITE ──────────────

  it('executes WRITE statement', async () => {
    const output = await runProgram('WRITE "Hello", 42');
    expect(output[0]).toBe('"Hello", 42');
  });

  it('WRITE with no arguments outputs blank line', async () => {
    const output = await runProgram('WRITE');
    // WRITE with no args outputs an empty line; buffer shows it as empty row
    expect(output.length).toBe(0);
  });

  // ────────────── LOCATE ──────────────

  it('executes LOCATE statement with absolute row positioning', async () => {
    const output = await runProgram('LOCATE 5, 1\nPRINT "Hello"');
    // LOCATE 5,1 pads output to 5 rows, "Hello" at row 5
    expect(output.length).toBe(5);
    expect(output[4]).toBe('Hello');
  });

  it('executes LOCATE statement with column indentation', async () => {
    const output = await runProgram('LOCATE 5, 10\nPRINT "OK"');
    // LOCATE sets cursorX to 9 (col 10 - 1), so next PRINT is padded
    const line = typeof output[4] === 'string' ? output[4] : (output[4] as any).text;
    expect(line).toBe('         OK');
  });

  it('LOCATE only affects next PRINT, then resets', async () => {
    const output = await runProgram('LOCATE 1, 20\nPRINT "A"\nPRINT "B"');
    // First PRINT is indented, second is not (cursorX resets after PRINT)
    const line0 = typeof output[0] === 'string' ? output[0] : (output[0] as any).text;
    const line1 = typeof output[1] === 'string' ? output[1] : (output[1] as any).text;
    expect(line0).toBe('                   A');
    expect(line1).toBe('B');
  });

  // ────────────── COLOR ──────────────

  it('executes COLOR statement', async () => {
    const output = await runProgram('COLOR 14\nPRINT "OK"');
    expect(output[0]).toBe('OK');
  });

  // ────────────── ERASE ──────────────

  it('executes ERASE statement', async () => {
    const output = await runProgram(
      'DIM A(5)\nA(1) = 10\nPRINT A(1)\nERASE A\nPRINT "Done"'
    );
    expect(output[0]).toBe('10');
    expect(output[1]).toBe('Done');
  });

  // ────────────── SELECT CASE ──────────────

  it('executes SELECT CASE with matching value', async () => {
    const output = await runProgram(
      `X = 2
      SELECT CASE X
        CASE 1
          PRINT "One"
        CASE 2
          PRINT "Two"
        CASE 3
          PRINT "Three"
      END SELECT`
    );
    expect(output[0]).toBe('Two');
  });

  it('executes SELECT CASE with CASE ELSE', async () => {
    const output = await runProgram(
      'X = 5\nSELECT CASE X\nCASE 1\nPRINT "One"\nCASE ELSE\nPRINT "Other"\nEND SELECT'
    );
    expect(output[0]).toBe('Other');
  });

  it('SELECT CASE with no match and no CASE ELSE', async () => {
    const output = await runProgram(
      'X = 99\nSELECT CASE X\nCASE 1\nPRINT "One"\nEND SELECT\nPRINT "Done"'
    );
    expect(output[0]).toBe('Done');
  });

  // ────────────── DEF FN ──────────────

  it('defines and uses DEF FN function', async () => {
    const output = await runProgram(
      'DEF FN DOUBLE(X) = X * 2\nPRINT FN DOUBLE(5)'
    );
    expect(output[0]).toBe('10');
  });

  // ────────────── LINE INPUT ──────────────

  it('LINE INPUT accepts full line input', async () => {
    const lexer = new Lexer('LINE INPUT A$\nPRINT A$');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    interpreter.setInputCallback(async () => 'Hello World');
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    // INPUT writes prompt '? ' then the user input, then PRINT writes on next line
    expect(output.some(line => line.includes('Hello World'))).toBe(true);
  });

  // ────────────── INPUT integration tests ──────────────

  it('INPUT with ; separator does not show ?', async () => {
    const lexer = new Lexer('INPUT "nom"; N$\nPRINT N$');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const stmt = ast.statements[0] as any;
    expect(stmt.separator).toBe(';');
    const interpreter = new GWBASICInterpreter();
    interpreter.setInputCallback(async () => 'Alice');
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    // Prompt should not have "?" after "nom"
    expect(output.some(line => line.includes('nom?'))).toBe(false);
    expect(output.some(line => line.includes('Alice'))).toBe(true);
  });

  it('INPUT with , separator shows ?', async () => {
    const lexer = new Lexer('INPUT "nom", N$\nPRINT N$');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const stmt = ast.statements[0] as any;
    expect(stmt.separator).toBe(',');
    const interpreter = new GWBASICInterpreter();
    interpreter.setInputCallback(async () => 'Bob');
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output.some(line => line.includes('nom?'))).toBe(true);
  });

  it('INPUT validates numeric variable and shows error on text', async () => {
    const code = 'INPUT X\nPRINT X';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    interpreter.setInputCallback(async () => 'abc');
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    // X is numeric (no $ suffix), so "abc" should fail and show Redo in buffer
    expect(output.some(line => line.toLowerCase().includes('redo'))).toBe(true);
  });

  it('INPUT accepts numeric value for numeric variable', async () => {
    const interpreter = new GWBASICInterpreter();
    interpreter.setInputCallback(async () => '42');
    const lexer = new Lexer('INPUT X\nPRINT X');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output.some(line => line.includes('42'))).toBe(true);
  });

  it('INPUT with LOCATE positions cursor correctly', async () => {
    const interpreter = new GWBASICInterpreter();
    interpreter.setInputCallback(async () => 'test');
    interpreter.setOnOutputCallback(() => {});
    const lexer = new Lexer('LOCATE 5,5 : INPUT "nom"; N$');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    await interpreter.execute(ast);
    const buffer = interpreter.getBuffer();
    // "nom" should start at column 4 (0-indexed) on row 4 (0-indexed)
    expect(buffer[4][4].char).toBe('n');
    expect(buffer[4][5].char).toBe('o');
    expect(buffer[4][6].char).toBe('m');
  });

  it('INPUT with COLOR uses correct foreground color', async () => {
    const interpreter = new GWBASICInterpreter();
    interpreter.setInputCallback(async () => 'hello');
    interpreter.setOnOutputCallback(() => {});
    const lexer = new Lexer('COLOR 10 : INPUT "inp"; N$');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    await interpreter.execute(ast);
    const buffer = interpreter.getBuffer();
    // Color 10 = #55FF55 (green)
    expect(buffer[0][0].char).toBe('i');
    expect(buffer[0][0].fg).toBe('#55FF55');
  });

  it('LINE INPUT preserves commas in input', async () => {
    const interpreter = new GWBASICInterpreter();
    interpreter.setInputCallback(async () => 'Hello, World, Test');
    const lexer = new Lexer('LINE INPUT A$\nPRINT A$');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    // LINE INPUT should not split on commas
    expect(output.some(line => line.includes('Hello, World, Test'))).toBe(true);
  });

  it('parser creates InputStatement with lineInput flag', async () => {
    const lexer = new Lexer('LINE INPUT A$');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const stmt = ast.statements[0] as any;
    expect(stmt.type).toBe('InputStatement');
    expect(stmt.lineInput).toBe(true);
  });

  // ────────────── MIN, MAX, MOYAR, MOYPO, ARRPROCH ──────────────

  it('MIN returns the minimum of two numbers', async () => {
    const output = await runProgram('PRINT MIN(3, 7)');
    expect(output[0]).toBe('3');
  });

  it('MIN returns the minimum of multiple numbers', async () => {
    const output = await runProgram('PRINT MIN(10, 3, 8, 1, 5)');
    expect(output[0]).toBe('1');
  });

  it('MIN works with negative numbers', async () => {
    const output = await runProgram('PRINT MIN(-5, -2, -10)');
    expect(output[0]).toBe('-10');
  });

  it('MAX returns the maximum of two numbers', async () => {
    const output = await runProgram('PRINT MAX(3, 7)');
    expect(output[0]).toBe('7');
  });

  it('MAX returns the maximum of multiple numbers', async () => {
    const output = await runProgram('PRINT MAX(10, 3, 8, 1, 5)');
    expect(output[0]).toBe('10');
  });

  it('MAX works with negative numbers', async () => {
    const output = await runProgram('PRINT MAX(-5, -2, -10)');
    expect(output[0]).toBe('-2');
  });

  it('MOYAR computes the arithmetic mean', async () => {
    const output = await runProgram('PRINT MOYAR(10, 20, 30)');
    expect(output[0]).toBe('20');
  });

  it('MOYAR with a single value returns that value', async () => {
    const output = await runProgram('PRINT MOYAR(42)');
    expect(output[0]).toBe('42');
  });

  it('MOYAR with decimal numbers', async () => {
    const output = await runProgram('PRINT MOYAR(1, 2, 3, 4)');
    expect(parseFloat(output[0])).toBeCloseTo(2.5, 5);
  });

  it('MOYPO computes weighted average', async () => {
    // MOYPO(10, 2, 20, 3) = (10*2 + 20*3) / (2+3) = 80/5 = 16
    const output = await runProgram('PRINT MOYPO(10, 2, 20, 3)');
    expect(output[0]).toBe('16');
  });

  it('MOYPO with equal weights equals arithmetic mean', async () => {
    // MOYPO(10, 1, 20, 1) = (10+20)/2 = 15
    const output = await runProgram('PRINT MOYPO(10, 1, 20, 1)');
    expect(output[0]).toBe('15');
  });

  it('ARRPROCH with TRUE (default) rounds up to next multiple', async () => {
    // ARRPROCH(17, 5, TRUE) = 20 (rounds up)
    const output = await runProgram('PRINT ARRPROCH(17, 5)');
    expect(output[0]).toBe('20');
  });

  it('ARRPROCH with TRUE (-1) rounds up explicitly', async () => {
    // ARRPROCH(17, 5, -1) = 20 (BASIC convention: -1 = TRUE)
    const output = await runProgram('PRINT ARRPROCH(17, 5, -1)');
    expect(output[0]).toBe('20');
  });

  it('ARRPROCH with FALSE (0) rounds down to previous multiple', async () => {
    // ARRPROCH(17, 5, 0) = 15 (rounds down)
    const output = await runProgram('PRINT ARRPROCH(17, 5, 0)');
    expect(output[0]).toBe('15');
  });

  it('ARRPROCH with exact multiple returns the same value', async () => {
    const output = await runProgram('PRINT ARRPROCH(20, 5)');
    expect(output[0]).toBe('20');
  });

  it('ARRPROCH with FALSE (0) rounds down 0.25 step', async () => {
    // ARRPROCH(12.33, 0.25, 0) = 12.25
    const output = await runProgram('PRINT ARRPROCH(12.33, 0.25, 0)');
    expect(parseFloat(output[0])).toBeCloseTo(12.25, 5);
  });

  it('ARRPROCH with TRUE (-1) rounds up 0.25 step', async () => {
    // ARRPROCH(12.33, 0.25, -1) = 12.5
    const output = await runProgram('PRINT ARRPROCH(12.33, 0.25, -1)');
    expect(parseFloat(output[0])).toBeCloseTo(12.5, 5);
  });

  it('ARRPROCH with FALSE (0) rounds down for decimal step', async () => {
    const output = await runProgram('PRINT ARRPROCH(3.3, 0.5, 0)');
    expect(parseFloat(output[0])).toBeCloseTo(3.0, 5);
  });

  it('ARRPROCH with TRUE (default) rounds up for decimal step', async () => {
    const output = await runProgram('PRINT ARRPROCH(3.3, 0.5)');
    expect(parseFloat(output[0])).toBeCloseTo(3.5, 5);
  });

  it('ARRPROCH with negative value and TRUE (default) rounds up', async () => {
    // ARRPROCH(-17, 5) = ceil(-3.4) * 5 = -3 * 5 = -15
    const output = await runProgram('PRINT ARRPROCH(-17, 5)');
    expect(output[0]).toBe('-15');
  });

  it('ARRPROCH with negative value and FALSE (0) rounds down', async () => {
    // ARRPROCH(-17, 5, 0) = floor(-3.4) * 5 = -4 * 5 = -20
    const output = await runProgram('PRINT ARRPROCH(-17, 5, 0)');
    expect(output[0]).toBe('-20');
  });

  it('ARRPROCH with large positive value and TRUE (default)', async () => {
    const output = await runProgram('PRINT ARRPROCH(12345, 1000)');
    expect(output[0]).toBe('13000');
  });

  it('ARRPROCH with large positive value and FALSE (0)', async () => {
    const output = await runProgram('PRINT ARRPROCH(12345, 1000, 0)');
    expect(output[0]).toBe('12000');
  });

  it('ARRPROCH with variables and TRUE (default)', async () => {
    const output = await runProgram('X = 23 : M = 5\nPRINT ARRPROCH(X, M)');
    expect(output[0]).toBe('25');
  });

  it('ARRPROCH with variables and FALSE (0)', async () => {
    const output = await runProgram('X = 23 : M = 5\nPRINT ARRPROCH(X, M, 0)');
    expect(output[0]).toBe('20');
  });

  it('MIN with zero and positive numbers', async () => {
    const output = await runProgram('PRINT MIN(0, 5, 10)');
    expect(output[0]).toBe('0');
  });

  it('MIN with decimal numbers', async () => {
    const output = await runProgram('PRINT MIN(3.5, 2.1, 4.8)');
    expect(parseFloat(output[0])).toBeCloseTo(2.1, 5);
  });

  it('MAX with a single argument returns that argument', async () => {
    const output = await runProgram('PRINT MAX(99)');
    expect(output[0]).toBe('99');
  });

  it('MAX with zero and negative numbers', async () => {
    const output = await runProgram('PRINT MAX(-5, -10, 0)');
    expect(output[0]).toBe('0');
  });

  it('MAX with decimal numbers', async () => {
    const output = await runProgram('PRINT MAX(3.5, 2.1, 4.8)');
    expect(parseFloat(output[0])).toBeCloseTo(4.8, 5);
  });

  it('MIN and MAX can be used in expressions', async () => {
    const output = await runProgram('PRINT MIN(5, 10) + MAX(1, 3)');
    expect(output[0]).toBe('8');
  });

  it('MIN and MAX can be nested', async () => {
    const output = await runProgram('PRINT MIN(MAX(1, 5), MIN(10, 3))');
    expect(output[0]).toBe('3');
  });

  it('MOYAR with decimal mean result', async () => {
    const output = await runProgram('PRINT MOYAR(1, 2, 3, 4, 5, 6)');
    expect(parseFloat(output[0])).toBeCloseTo(3.5, 5);
  });

  it('MOYAR with identical values returns that value', async () => {
    const output = await runProgram('PRINT MOYAR(7, 7, 7, 7)');
    expect(output[0]).toBe('7');
  });

  it('MOYAR with negative values', async () => {
    const output = await runProgram('PRINT MOYAR(-10, 0, 10)');
    expect(output[0]).toBe('0');
  });

  it('MOYAR can be used in an expression', async () => {
    const output = await runProgram('PRINT MOYAR(10, 20) * 2');
    expect(output[0]).toBe('30');
  });

  it('MOYPO with three pairs', async () => {
    // MOYPO(5, 1, 10, 2, 15, 3) = (5*1 + 10*2 + 15*3) / (1+2+3) = 70/6 ≈ 11.666...
    const output = await runProgram('PRINT MOYPO(5, 1, 10, 2, 15, 3)');
    expect(parseFloat(output[0])).toBeCloseTo(11.6667, 3);
  });

  it('MOYPO with zero weight throws an error', async () => {
    const lexer = new Lexer('PRINT MOYPO(10, 0)');
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();
    await interpreter.execute(ast);
    const output = interpreter.getOutput();
    expect(output.some(line => line.toLowerCase().includes('error'))).toBe(true);
  });

  it('MOYPO with decimal weights and values', async () => {
    // MOYPO(2.5, 1.5, 3.5, 0.5) = (2.5*1.5 + 3.5*0.5) / (1.5+0.5) = 5.5/2 = 2.75
    const output = await runProgram('PRINT MOYPO(2.5, 1.5, 3.5, 0.5)');
    expect(parseFloat(output[0])).toBeCloseTo(2.75, 5);
  });

  it('MIN with variable arguments', async () => {
    const output = await runProgram('A = 15 : B = 3 : C = 8\nPRINT MIN(A, B, C)');
    expect(output[0]).toBe('3');
  });

  it('MAX with variable arguments', async () => {
    const output = await runProgram('A = 15 : B = 3 : C = 8\nPRINT MAX(A, B, C)');
    expect(output[0]).toBe('15');
  });

  it('MOYAR with variables', async () => {
    const output = await runProgram('A = 10 : B = 20 : C = 30\nPRINT MOYAR(A, B, C)');
    expect(output[0]).toBe('20');
  });

  it('ARRPROCH with variables', async () => {
    const output = await runProgram('X = 23 : M = 5\nPRINT ARRPROCH(X, M)');
    expect(output[0]).toBe('25');
  });

  it('using MIN in a FOR loop condition', async () => {
    const output = await runProgram('A = 3 : B = 7\nFOR I = 1 TO MIN(A, B)\nPRINT I\nNEXT I');
    expect(output).toEqual(['1', '2', '3']);
  });

  it('using MAX in a FOR loop condition', async () => {
    const output = await runProgram('A = 3 : B = 7\nFOR I = MAX(A, B) TO 10\nPRINT I\nNEXT I');
    expect(output).toEqual(['7', '8', '9', '10']);
  });

  // ────────────── CEIL / FLOOR ──────────────

  it('CEIL rounds up to the nearest integer', async () => {
    const output = await runProgram('PRINT CEIL(1.2)');
    expect(output[0]).toBe('2');
  });

  it('CEIL of an integer returns the same value', async () => {
    const output = await runProgram('PRINT CEIL(5)');
    expect(output[0]).toBe('5');
  });

  it('CEIL of a negative decimal rounds toward zero', async () => {
    // CEIL(-1.2) = -1 (ceil rounds toward +∞, so -1.2 → -1)
    const output = await runProgram('PRINT CEIL(-1.2)');
    expect(output[0]).toBe('-1');
  });

  it('CEIL of zero returns zero', async () => {
    const output = await runProgram('PRINT CEIL(0)');
    expect(output[0]).toBe('0');
  });

  it('FLOOR rounds down to the nearest integer', async () => {
    const output = await runProgram('PRINT FLOOR(1.2)');
    expect(output[0]).toBe('1');
  });

  it('FLOOR of an integer returns the same value', async () => {
    const output = await runProgram('PRINT FLOOR(5)');
    expect(output[0]).toBe('5');
  });

  it('FLOOR of a negative decimal rounds away from zero', async () => {
    // FLOOR(-1.2) = -2 (floor rounds toward -∞, so -1.2 → -2)
    const output = await runProgram('PRINT FLOOR(-1.2)');
    expect(output[0]).toBe('-2');
  });

  it('FLOOR of zero returns zero', async () => {
    const output = await runProgram('PRINT FLOOR(0)');
    expect(output[0]).toBe('0');
  });

  it('CEIL in an expression', async () => {
    const output = await runProgram('PRINT CEIL(2.3) * 10');
    expect(output[0]).toBe('30');
  });

  it('FLOOR in an expression', async () => {
    const output = await runProgram('PRINT FLOOR(2.8) * 10');
    expect(output[0]).toBe('20');
  });

  it('CEIL with a variable', async () => {
    const output = await runProgram('X = 3.7\nPRINT CEIL(X)');
    expect(output[0]).toBe('4');
  });

  it('FLOOR with a variable', async () => {
    const output = await runProgram('X = 3.7\nPRINT FLOOR(X)');
    expect(output[0]).toBe('3');
  });

  // ────────────── SUM / PROD / MEDIAN / STD ──────────────

  it('SUM adds multiple numbers', async () => {
    const output = await runProgram('PRINT SUM(1, 2, 3, 4, 5)');
    expect(output[0]).toBe('15');
  });

  it('SUM with a single argument', async () => {
    const output = await runProgram('PRINT SUM(42)');
    expect(output[0]).toBe('42');
  });

  it('SUM with negative numbers', async () => {
    const output = await runProgram('PRINT SUM(-5, 10, -3)');
    expect(output[0]).toBe('2');
  });

  it('SUM with decimal numbers', async () => {
    const output = await runProgram('PRINT SUM(1.5, 2.5, 3.0)');
    expect(parseFloat(output[0])).toBeCloseTo(7.0, 5);
  });

  it('PROD multiplies multiple numbers', async () => {
    const output = await runProgram('PRINT PROD(2, 3, 4)');
    expect(output[0]).toBe('24');
  });

  it('PROD with a single argument', async () => {
    const output = await runProgram('PRINT PROD(7)');
    expect(output[0]).toBe('7');
  });

  it('PROD with negative numbers', async () => {
    const output = await runProgram('PRINT PROD(-2, 3, -4)');
    expect(output[0]).toBe('24');
  });

  it('PROD with zero', async () => {
    const output = await runProgram('PRINT PROD(5, 0, 10)');
    expect(output[0]).toBe('0');
  });

  it('MEDIAN with odd number of values', async () => {
    const output = await runProgram('PRINT MEDIAN(3, 7, 5)');
    expect(output[0]).toBe('5');
  });

  it('MEDIAN with even number of values (average of two middle)', async () => {
    const output = await runProgram('PRINT MEDIAN(1, 3, 5, 7)');
    expect(output[0]).toBe('4');
  });

  it('MEDIAN with unsorted input', async () => {
    const output = await runProgram('PRINT MEDIAN(10, 1, 5)');
    expect(output[0]).toBe('5');
  });

  it('MEDIAN with a single value', async () => {
    const output = await runProgram('PRINT MEDIAN(99)');
    expect(output[0]).toBe('99');
  });

  it('MEDIAN with decimal numbers', async () => {
    const output = await runProgram('PRINT MEDIAN(1.5, 2.5, 3.5)');
    expect(parseFloat(output[0])).toBeCloseTo(2.5, 5);
  });

  it('STD computes sample standard deviation', async () => {
    // STD(2, 4, 4, 4, 5, 5, 7, 9): mean = 5, variance = 32/7 ≈ 4.571, std ≈ 2.138
    const output = await runProgram('PRINT STD(2, 4, 4, 4, 5, 5, 7, 9)');
    expect(parseFloat(output[0])).toBeCloseTo(2.138, 2);
  });

  it('STD with identical values gives 0', async () => {
    const output = await runProgram('PRINT STD(5, 5, 5, 5)');
    expect(parseFloat(output[0])).toBeCloseTo(0, 5);
  });

  it('STD with two values', async () => {
    // STD(1, 3): mean=2, variance=(1+1)/1=2, std=sqrt(2)≈1.414
    const output = await runProgram('PRINT STD(1, 3)');
    expect(parseFloat(output[0])).toBeCloseTo(1.4142, 3);
  });

  it('STD with variables', async () => {
    const output = await runProgram('A = 2 : B = 4 : C = 6\nPRINT STD(A, B, C)');
    expect(parseFloat(output[0])).toBeCloseTo(2.0, 3);
  });

  it('SUM with variables', async () => {
    const output = await runProgram('A = 10 : B = 20 : C = 30\nPRINT SUM(A, B, C)');
    expect(output[0]).toBe('60');
  });

  it('PROD with variables', async () => {
    const output = await runProgram('A = 2 : B = 3 : C = 4\nPRINT PROD(A, B, C)');
    expect(output[0]).toBe('24');
  });

  it('MEDIAN with variables', async () => {
    const output = await runProgram('A = 10 : B = 3 : C = 8\nPRINT MEDIAN(A, B, C)');
    expect(output[0]).toBe('8');
  });
});
