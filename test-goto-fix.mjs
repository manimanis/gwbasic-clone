// Quick verification script for the GOTO label fix
import { Lexer } from './client/src/lib/lexer.ts';
import { Parser } from './client/src/lib/parser.ts';
import { GWBASICInterpreter } from './client/src/lib/interpreter.ts';

const code = `40 GOTO 100
100 a = 1.0: b = 3.0
105 print a, b
110 END`;

const lexer = new Lexer(code);
const tokens = lexer.tokenize();
const parser = new Parser(tokens);
const ast = parser.parse();

console.log('AST statements:');
ast.statements.forEach((s, i) => {
  console.log(`  [${i}] type=${s.type}, line=${s.line}`);
});

const interpreter = new GWBASICInterpreter();
await interpreter.execute(ast);
const vars = interpreter.getVariables();
console.log('\nVariables after execution:');
vars.forEach(v => console.log(`  ${v.name} = ${v.value} (${v.type})`));

const output = interpreter.getOutput();
console.log('\nOutput:');
output.forEach((line, i) => console.log(`  [${i}] "${line}"`));

// Verify
const varA = vars.find(v => v.name === 'A');
const varB = vars.find(v => v.name === 'B');
if (!varA || !varB) {
  console.error('\n❌ FAIL: Missing variables!');
  process.exit(1);
}
if (varA.value !== '1' || varB.value !== '3') {
  console.error(`\n❌ FAIL: Wrong values! A=${varA.value}, B=${varB.value}`);
  process.exit(1);
}
console.log('\n✅ PASS: Both variables A=1 and B=3 are correctly assigned after GOTO 100');