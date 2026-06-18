import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { GWBASICInterpreter } from '../interpreter';

describe('WHILE...WEND', () => {
  it('exécute un WHILE simple qui itère 3 fois', async () => {
    const code = `
10 I = 1
20 WHILE I <= 3
30   PRINT I
40   I = I + 1
50 WEND
60 PRINT "DONE"
    `;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();

    await interpreter.execute(ast);
    const output = interpreter.getOutput();

    expect(output[0]).toBe('1');
    expect(output[1]).toBe('2');
    expect(output[2]).toBe('3');
    expect(output[3]).toBe('DONE');
  });

  it('n\'exécute PAS le corps si la condition est fausse dès le début', async () => {
    const code = `
10 I = 10
20 WHILE I <= 3
30   PRINT I
40   I = I + 1
50 WEND
60 PRINT "END"
    `;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();

    await interpreter.execute(ast);
    const output = interpreter.getOutput();

    expect(output).toEqual(['END']);
  });

  it('exécute un WHILE sur une seule ligne avec séparateur :', async () => {
    const code = 'I = 1 : WHILE I <= 3 : PRINT I : I = I + 1 : WEND : PRINT "DONE"';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();

    await interpreter.execute(ast);
    const output = interpreter.getOutput();

    expect(output).toEqual(['1', '2', '3', 'DONE']);
  });

  it('exécute un WHILE avec un pas décroissant', async () => {
    const code = `
10 I = 5
20 WHILE I >= 1
30   PRINT I
40   I = I - 1
50 WEND
60 PRINT "END"
    `;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();

    await interpreter.execute(ast);
    const output = interpreter.getOutput();

    expect(output).toEqual(['5', '4', '3', '2', '1', 'END']);
  });

  it('exécute des WHILE imbriqués', async () => {
    const code = `
10 I = 1
20 WHILE I <= 2
30   J = 1
40   WHILE J <= 2
50     PRINT I * J
60     J = J + 1
70   WEND
80   I = I + 1
90 WEND
    `;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();

    await interpreter.execute(ast);
    const output = interpreter.getOutput();

    // 1*1=1, 1*2=2, 2*1=2, 2*2=4
    expect(output).toEqual(['1', '2', '2', '4']);
  });

  // NOTE: EXIT WHILE n'est pas encore supporté car l'implémentation actuelle
  // de ExitWhileStatement met running = false ce qui arrête tout le programme
  // au lieu de juste la boucle WHILE.
  
  it('WHILE avec condition utilisant une variable string', async () => {
    const code = `
10 A$ = "OUI"
20 WHILE A$ = "OUI"
30   PRINT "BOUCLE"
40   A$ = "NON"
50 WEND
60 PRINT "FIN"
    `;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    console.log(ast);
    const interpreter = new GWBASICInterpreter();

    await interpreter.execute(ast);
    const output = interpreter.getOutput();

    expect(output).toEqual(['BOUCLE', 'FIN']);
  });

  it('WHILE avec PRINT et point-virgule (pas de saut de ligne)', async () => {
    const code = 'I = 1 : WHILE I <= 3 : PRINT I; : I = I + 1 : WEND';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();

    await interpreter.execute(ast);
    const output = interpreter.getOutput();

    // Avec PRINT I; les valeurs sont concaténées sur la même ligne
    expect(output[0]).toBe('123');
  });

  it('s\'arrête si le compteur d\'itérations est dépassé', async () => {
    const code = `
10 I = 1
20 WHILE I > 0
30   I = I + 1
40 WEND
50 PRINT "FIN"
    `;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new GWBASICInterpreter();

    await interpreter.execute(ast);
    const output = interpreter.getOutput();

    // La boucle sera interrompue par la limite d'itérations (MAX_ITERATIONS = 1000000)
    // Donc "FIN" ne doit pas être affiché car l'exécution s'arrête avant
    expect(output.find(l => l === 'FIN')).toBeUndefined();
  });

  it('exécute WHILE en step mode avec les bonnes étapes', async () => {
    const code = 'I = 1 : WHILE I <= 2 : PRINT I : I = I + 1 : WEND';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const interpreter = new GWBASICInterpreter();
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

    expect(output).toEqual(['1', '2']);

    // Vérifie la séquence des étapes
    // Les étapes devraient être (ordre approximatif) :
    // 1. LetStatement (I = 1)
    // 2. WhileStatement (condition check)
    // 3. PrintStatement (PRINT I)
    // 4. LetStatement (I = I + 1)
    // 5. WhileStatement (condition check, boucle)
    // 6. PrintStatement (PRINT I)
    // 7. LetStatement (I = I + 1)
    // 8. WhileStatement (condition check, sortie)
    const whileCount = steps.filter(s => s.stmtType === 'WhileStatement').length;
    const printCount = steps.filter(s => s.stmtType === 'PrintStatement').length;
    expect(whileCount).toBe(3); // 2 itérations + 1 sortie
    expect(printCount).toBe(2);
  });
});