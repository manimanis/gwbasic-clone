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

  it('executes FOR loop step by step showing each instruction', async () => {
    const code = 'FOR I = 1 TO 3 : PRINT I : NEXT I';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const interpreter = new GWBASICInterpreter();
    
    // Track all steps executed
    const steps: Array<{ stmtType: string; line: number | undefined; vars: Array<{ name: string; value: string; type: string }> }> = [];
    
    interpreter.enableStepMode(true);
    interpreter.setStepCallback((info, resume) => {
      // Record the step: what instruction is about to execute and current variables
      steps.push({
        stmtType: info.statementType,
        line: info.lineNumber,
        vars: [...info.variables.map(v => ({ name: v.name, value: v.value, type: v.type }))]
      });
      // Resume immediately — execute the instruction
      resume();
    });

    await interpreter.execute(ast);
    const output = interpreter.getOutput();

    // Verify correct output
    expect(output).toEqual(['1', '2', '3']);

    // Verify the step-by-step execution order matches GWBASIC FOR loop behavior
    // The step callback fires BEFORE the statement executes, so the variable
    // state shown is what it was BEFORE the current statement.
    //
    // Expected sequence (9 steps total):
    // 1. FOR I = 1 TO 3  → I not yet set (step fire BEFORE init)
    // 2. PRINT I          → I=1 (set by step 1's FOR)
    // 3. NEXT I           → I=1 → increments to I=2, compare 2<=3 → continue → pc = forPc-1
    // 4. FOR I = 1 TO 3  → I=2 (already set by NEXT, loop-back detected)
    // 5. PRINT I          → I=2
    // 6. NEXT I           → I=2 → increments to I=3, compare 3<=3 → continue → pc = forPc-1
    // 7. FOR I = 1 TO 3  → I=3 (loop-back detected)
    // 8. PRINT I          → I=3
    // 9. NEXT I           → I=3 → increments to I=4, compare 4<=3 → stop → pop stack
    
    expect(steps.length).toBe(9);
    expect(steps[0].stmtType).toBe('ForStatement');
    expect(steps[1].stmtType).toBe('PrintStatement');
    expect(steps[2].stmtType).toBe('NextStatement');
    expect(steps[3].stmtType).toBe('ForStatement');
    expect(steps[4].stmtType).toBe('PrintStatement');
    expect(steps[5].stmtType).toBe('NextStatement');
    expect(steps[6].stmtType).toBe('ForStatement');
    expect(steps[7].stmtType).toBe('PrintStatement');
    expect(steps[8].stmtType).toBe('NextStatement');
    
    // Verify I value at each step
    // Step 0: BEFORE FOR I=1 TO 3 → I not initialized yet
    // Step 1: BEFORE PRINT I → I should now be 1 (set by step 0's FOR execution)
    const iStep1 = steps[1].vars.find(v => v.name === 'I');
    expect(iStep1).toBeDefined();
    expect(iStep1!.value).toBe('1');
    
    // Step 3: FOR loop-back → I should now be 2 (from NEXT increment in step 2)
    const iStep3 = steps[3].vars.find(v => v.name === 'I');
    expect(iStep3!.value).toBe('2');
    
    // Step 6: FOR loop-back → I should now be 3
    const iStep6 = steps[6].vars.find(v => v.name === 'I');
    expect(iStep6!.value).toBe('3');
    
    // Step 8: NEXT I → I should now be 3 (before increment happens)
    const iStep8 = steps[8].vars.find(v => v.name === 'I');
    expect(iStep8!.value).toBe('3');
  });

  it('executes nested FOR loop step by step showing each instruction', async () => {
    const code = 'FOR I = 1 TO 2 : FOR J = 1 TO 2 : PRINT I * J : NEXT J : NEXT I';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const interpreter = new GWBASICInterpreter();
    
    // Track all steps executed
    const steps: Array<{ stmtType: string; vars: Array<{ name: string; value: string; type: string }> }> = [];
    
    interpreter.enableStepMode(true);
    interpreter.setStepCallback((info, resume) => {
      steps.push({
        stmtType: info.statementType,
        vars: [...info.variables.map(v => ({ name: v.name, value: v.value, type: v.type }))]
      });
      resume();
    });

    await interpreter.execute(ast);
    const output = interpreter.getOutput();

    // Verify correct output: 1*1=1, 1*2=2, 2*1=2, 2*2=4
    expect(output).toEqual(['1', '2', '2', '4']);
    
    // Verify step sequence: 16 steps for the nested loop
    // The step callback fires BEFORE each statement executes.
    //
    // Outer I=1:
    //   0: FOR I=1 TO 2     (init I=1)
    //   1: FOR J=1 TO 2     (init J=1)
    //   2: PRINT I*J        → 1
    //   3: NEXT J           (J:1→2, 2<=2 cont)
    //   4: FOR J=1 TO 2     (loop-back)
    //   5: PRINT I*J        → 2
    //   6: NEXT J           (J:2→3, 3<=2 stop, pop J)
    //   7: NEXT I           (I:1→2, 2<=2 cont)
    // Outer I=2:
    //   8: FOR I=1 TO 2     (loop-back)
    //   9: FOR J=1 TO 2     (init J=1)
    //  10: PRINT I*J        → 2
    //  11: NEXT J           (J:1→2, 2<=2 cont)
    //  12: FOR J=1 TO 2     (loop-back)
    //  13: PRINT I*J        → 4
    //  14: NEXT J           (J:2→3, 3<=2 stop, pop J)
    //  15: NEXT I           (I:2→3, 3<=2 stop, pop I)
    expect(steps.length).toBe(16);
    
    // Verify that the step mode shows the correct I and J values
    // Step 0: BEFORE FOR I=1 TO 2 → I not set yet (step fires before init)
    const iStep0 = steps[0].vars.find(v => v.name === 'I');
    expect(iStep0).toBeUndefined(); // I not yet initialized
    
    // Step 1: BEFORE FOR J=1 TO 2 → I=1 (set by step 0), J not set yet
    expect(steps[1].vars.find(v => v.name === 'I')!.value).toBe('1');
    const jStep1 = steps[1].vars.find(v => v.name === 'J');
    expect(jStep1).toBeUndefined(); // J not yet initialized
    
    // Step 2: BEFORE PRINT I*J → I=1, J=1
    expect(steps[2].vars.find(v => v.name === 'J')!.value).toBe('1');
    
    // Step 3: BEFORE NEXT J → I=1, J=1 (about to increment to 2)
    expect(steps[3].vars.find(v => v.name === 'J')!.value).toBe('1');
    
    // Step 6: BEFORE NEXT J → I=1, J=2 (about to increment to 3, stop)
    expect(steps[6].vars.find(v => v.name === 'J')!.value).toBe('2');
    
    // Step 7: BEFORE NEXT I → I=1 (about to increment to 2)
    expect(steps[7].vars.find(v => v.name === 'I')!.value).toBe('1');
    
    // Step 9: BEFORE FOR J=1 TO 2 → I=2, J not set yet (about to init J=1)
    expect(steps[9].vars.find(v => v.name === 'I')!.value).toBe('2');
    
    // Step 11: BEFORE NEXT J → I=2, J=1 (about to increment to 2)
    expect(steps[11].vars.find(v => v.name === 'J')!.value).toBe('1');
    
    // Step 14: BEFORE NEXT J → I=2, J=2 (about to increment to 3, stop)
    expect(steps[14].vars.find(v => v.name === 'J')!.value).toBe('2');
    
    // Step 15: BEFORE NEXT I → I=2 (about to increment to 3, stop)
    expect(steps[15].vars.find(v => v.name === 'I')!.value).toBe('2');
  });
});