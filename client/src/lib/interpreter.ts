/**
 * GWBASIC Interpreter - Executes the parsed AST (Abstract Syntax Tree)
 * Uses a cell-based terminal buffer (25 rows x 80 cols) where each cell
 * stores a character with foreground and background colors.
 */
import {
  type Program,
  type Statement,
  type Expression,
  type RuntimeValue,
  type NumberLiteral,
  type StringLiteral,
  type Identifier,
  type BinaryOp,
  type UnaryOp,
  type FunctionCall,
  type ArrayAccess,
  type PrintStatement,
  type InputStatement,
  type LetStatement,
  type IfStatement,
  type ForStatement,
  type WhileStatement,
  type GosubStatement,
  type ReturnStatement,
  type GotoStatement,
  type EndStatement,
  type DimStatement,
  type DataStatement,
  type ReadStatement,
  type RestoreStatement,
  type RandomizeStatement,
  type SwapStatement,
  type DoLoopStatement,
  type ExitForStatement,
  type ExitWhileStatement,
  type ExitDoStatement,
  type OnGotoStatement,
  type OnGosubStatement,
  type WriteStatement,
  type LocateStatement,
  type ColorStatement,
  type EraseStatement,
  type DefFnStatement,
  type SelectCaseStatement,
} from './types';

const MAX_ITERATIONS = 100000;
const SCREEN_WIDTH = 80;
const SCREEN_HEIGHT = 25;

// GWBASIC color palette (CGA 16 colors)
const GWBASIC_COLORS: Record<number, string> = {
  0: '#000000', 1: '#0000AA', 2: '#00AA00', 3: '#00AAAA',
  4: '#AA0000', 5: '#AA00AA', 6: '#AA5500', 7: '#AAAAAA',
  8: '#555555', 9: '#5555FF', 10: '#55FF55', 11: '#55FFFF',
  12: '#FF5555', 13: '#FF55FF', 14: '#FFFF55', 15: '#FFFFFF',
};

export interface TerminalCell {
  char: string;
  fg: string;
  bg: string;
}

export interface OutputLine {
  text: string;
  color?: string;
  indent?: number;
}

function makeCell(char: string, fg: string, bg: string): TerminalCell {
  return { char, fg, bg };
}

function emptyRow(fg: string, bg: string): TerminalCell[] {
  return Array.from({ length: SCREEN_WIDTH }, () => makeCell(' ', fg, bg));
}

function cloneBuffer(buf: TerminalCell[][]): TerminalCell[][] {
  return buf.map(row => row.map(c => ({ ...c })));
}

export class GWBASICInterpreter {
  private variables: Map<string, RuntimeValue> = new Map();
  private arrays: Map<string, RuntimeValue> = new Map();
  private dataValues: (number | string)[] = [];
  private dataIndex: number = 0;
  private callStack: number[] = [];
  private pc: number = 0;
  private statements: Statement[] = [];
  private labels: Map<number, number> = new Map();
  private running: boolean = false;
  private abortController: AbortController | null = null;
  private inputCallback?: (prompt: string) => Promise<string>;
  private onOutputCallback?: (buffer: TerminalCell[][], cursorX: number, cursorY: number, fgHex: string) => void;
  private cursorX: number = 0;
  private cursorY: number = 0;
  private currentFg: number = 7;
  private currentBg: number = 0;
  private iterationCount: number = 0;
  private buffer: TerminalCell[][] = [];
  private currentPrintLine: string = '';

  constructor() {
    this.initBuffer();
  }

  private initBuffer(): void {
    const fg = GWBASIC_COLORS[7];
    const bg = GWBASIC_COLORS[0];
    this.buffer = Array.from({ length: SCREEN_HEIGHT }, () => emptyRow(fg, bg));
  }

  private clearBuffer(): void {
    this.initBuffer();
    this.cursorX = 0;
    this.cursorY = 0;
  }

  private getFgColor(): string {
    return GWBASIC_COLORS[this.currentFg] || GWBASIC_COLORS[7];
  }

  private getBgColor(): string {
    return GWBASIC_COLORS[this.currentBg] || GWBASIC_COLORS[0];
  }

  private writeChar(ch: string): void {
    if (this.cursorY >= 0 && this.cursorY < SCREEN_HEIGHT &&
        this.cursorX >= 0 && this.cursorX < SCREEN_WIDTH) {
      this.buffer[this.cursorY][this.cursorX] = makeCell(ch, this.getFgColor(), this.getBgColor());
    }
    this.cursorX++;
    if (this.cursorX >= SCREEN_WIDTH) {
      this.cursorX = 0;
      this.cursorY++;
      if (this.cursorY >= SCREEN_HEIGHT) {
        this.scrollUp();
        this.cursorY = SCREEN_HEIGHT - 1;
      }
    }
  }

  private writeString(str: string): void {
    for (const ch of str) {
      if (ch === '\n') {
        this.cursorX = 0;
        this.cursorY++;
        if (this.cursorY >= SCREEN_HEIGHT) {
          this.scrollUp();
          this.cursorY = SCREEN_HEIGHT - 1;
        }
      } else {
        this.writeChar(ch);
      }
    }
  }

  private scrollUp(): void {
    const fg = this.getFgColor();
    const bg = this.getBgColor();
    this.buffer.shift();
    this.buffer.push(emptyRow(fg, bg));
  }

  private ensureOutputLine(): void {
    while (this.cursorY >= this.buffer.length) {
      this.buffer.push(emptyRow(this.getFgColor(), this.getBgColor()));
    }
  }

  public initializeBuiltins(): void {
    this.variables.set('PI', { type: 'number', value: Math.PI });
  }

  public abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.running = false;
    }
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getCurrentLine(): number {
    return this.pc;
  }

  public setInputCallback(callback: (prompt: string) => Promise<string>): void {
    this.inputCallback = callback;
  }

  public setOnOutputCallback(callback: (buffer: TerminalCell[][], cursorX: number, cursorY: number, fgHex: string) => void): void {
    this.onOutputCallback = callback;
  }

  /** Returns output as string lines for backward compatibility with tests */
  public getOutput(): string[] {
    const lines: string[] = [];
    for (const row of this.buffer) {
      let line = '';
      for (const cell of row) {
        line += cell.char;
      }
      // Trim trailing spaces (buffer rows are 80 chars wide)
      lines.push(line.replace(/\s+$/, ''));
    }
    // Trim trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    return lines;
  }

  /** Returns the raw terminal cell buffer */
  public getBuffer(): TerminalCell[][] {
    return this.buffer;
  }

  private emitBuffer(): void {
    if (this.onOutputCallback) {
      this.onOutputCallback(cloneBuffer(this.buffer), this.cursorX, this.cursorY, this.getFgColor());
    }
  }

  public async execute(program: Program): Promise<void> {
    this.statements = program.statements;
    this.running = true;
    this.pc = 0;
    this.iterationCount = 0;
    this.dataValues = [];
    this.dataIndex = 0;
    this.currentPrintLine = '';
    this.initBuffer();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.labels.clear();
    for (let i = 0; i < this.statements.length; i++) {
      const stmt = this.statements[i];
      if (stmt.line !== undefined) {
        this.labels.set(stmt.line, i);
      }
    }

    for (const stmt of this.statements) {
      if (stmt.type === 'DataStatement') {
        this.executeDataStatement(stmt as DataStatement);
      }
    }

    try {
      while (this.pc < this.statements.length && this.running) {
        this.iterationCount++;
        if (this.iterationCount > MAX_ITERATIONS) {
          this.writeString('ERROR: Program exceeded maximum iteration limit');
          break;
        }
        if (signal.aborted) {
          this.writeString('Program stopped by user');
          break;
        }
        const stmt = this.statements[this.pc];
        await this.executeStatement(stmt);
        this.pc++;
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const currentLine = this.pc < this.statements.length
        ? (this.statements[this.pc].line || this.pc + 1)
        : this.pc + 1;
      this.writeString(`ERROR at line ${currentLine}: ${errMsg}`);
    } finally {
      // Flush pending PRINT
      if (this.currentPrintLine.length > 0) {
        this.writeString(this.currentPrintLine);
        this.currentPrintLine = '';
      }
      this.emitBuffer();
      this.running = false;
    }
  }

  private getTargetPc(label: number): number {
    const target = this.labels.get(label);
    if (target !== undefined) return target;
    if (label > 0 && label <= this.statements.length) return label - 1;
    return 0;
  }

  private async executeStatement(stmt: Statement): Promise<void> {
    switch (stmt.type) {
      case 'PrintStatement':
        this.executePrintStatement(stmt as PrintStatement);
        break;
      case 'InputStatement':
        await this.executeInputStatement(stmt as InputStatement);
        break;
      case 'LetStatement':
        this.executeLetStatement(stmt as LetStatement);
        break;
      case 'IfStatement':
        await this.executeIfStatement(stmt as IfStatement);
        break;
      case 'ForStatement':
        await this.executeForStatement(stmt as ForStatement);
        break;
      case 'WhileStatement':
        await this.executeWhileStatement(stmt as WhileStatement);
        break;
      case 'GosubStatement':
        this.executeGosubStatement(stmt as GosubStatement);
        break;
      case 'ReturnStatement':
        this.executeReturnStatement();
        break;
      case 'GotoStatement':
        this.executeGotoStatement(stmt as GotoStatement);
        break;
      case 'EndStatement':
        this.running = false;
        break;
      case 'DimStatement':
        this.executeDimStatement(stmt as DimStatement);
        break;
      case 'DataStatement':
        this.executeDataStatement(stmt as DataStatement);
        break;
      case 'ReadStatement':
        this.executeReadStatement(stmt as ReadStatement);
        break;
      case 'RestoreStatement':
        this.executeRestoreStatement(stmt as RestoreStatement);
        break;
      case 'RandomizeStatement':
        break;
      case 'ClsStatement':
        this.clearBuffer();
        break;
      case 'NextStatement':
        break;
      case 'WendStatement':
        break;
      case 'SwapStatement':
        this.executeSwapStatement(stmt as SwapStatement);
        break;
      case 'DoLoopStatement':
        await this.executeDoLoopStatement(stmt as DoLoopStatement);
        break;
      case 'ExitForStatement':
      case 'ExitWhileStatement':
      case 'ExitDoStatement':
        this.running = false;
        break;
      case 'OnGotoStatement':
        this.executeOnGotoStatement(stmt as OnGotoStatement);
        break;
      case 'OnGosubStatement':
        this.executeOnGosubStatement(stmt as OnGosubStatement);
        break;
      case 'WriteStatement':
        this.executeWriteStatement(stmt as WriteStatement);
        break;
      case 'LocateStatement':
        this.executeLocateStatement(stmt as LocateStatement);
        break;
      case 'ColorStatement':
        this.executeColorStatement(stmt as ColorStatement);
        break;
      case 'RemStatement':
        break;
      case 'EraseStatement':
        this.executeEraseStatement(stmt as EraseStatement);
        break;
      case 'DefFnStatement':
        this.executeDefFnStatement(stmt as DefFnStatement);
        break;
      case 'SelectCaseStatement':
        await this.executeSelectCaseStatement(stmt as SelectCaseStatement);
        break;
    }
  }

  private executeSwapStatement(stmt: SwapStatement): void {
    const val1 = this.variables.get(stmt.var1) || { type: 'number', value: 0 };
    const val2 = this.variables.get(stmt.var2) || { type: 'number', value: 0 };
    this.variables.set(stmt.var1, val2);
    this.variables.set(stmt.var2, val1);
  }

  private async executeDoLoopStatement(stmt: DoLoopStatement): Promise<void> {
    let count = 0;
    const checkCondition = (): boolean => {
      const result = this.isTruthy(this.evaluateExpression(stmt.condition));
      return stmt.conditionType === 'while' ? result : !result;
    };
    if (stmt.position === 'start') {
      while (checkCondition()) {
        count++;
        if (count > MAX_ITERATIONS) throw new Error('DO loop exceeded maximum iterations');
        this.iterationCount++;
        if (this.iterationCount > MAX_ITERATIONS) throw new Error('Program exceeded maximum iteration limit');
        for (const s of stmt.body) {
          await this.executeStatement(s);
        }
      }
    } else {
      do {
        count++;
        if (count > MAX_ITERATIONS) throw new Error('DO loop exceeded maximum iterations');
        this.iterationCount++;
        if (this.iterationCount > MAX_ITERATIONS) throw new Error('Program exceeded maximum iteration limit');
        for (const s of stmt.body) {
          await this.executeStatement(s);
        }
      } while (checkCondition());
    }
  }

  private executePrintStatement(stmt: PrintStatement): void {
    let line = '';
    let hasTrailingSemicolon = false;
    for (const expr of stmt.expressions) {
      if (typeof expr === 'string') {
        if (expr === ',') {
          const padding = 14 - (line.length % 14);
          line += ' '.repeat(padding);
        } else if (expr === ';') {
          hasTrailingSemicolon = true;
        }
      } else {
        const value = this.evaluateExpression(expr);
        line += this.valueToString(value);
        hasTrailingSemicolon = false;
      }
    }
    const lastExpr = stmt.expressions[stmt.expressions.length - 1];
    if (typeof lastExpr === 'string' && lastExpr === ';') {
      hasTrailingSemicolon = true;
    }
    this.currentPrintLine += line;
    if (!hasTrailingSemicolon) {
      this.writeString(this.currentPrintLine);
      this.currentPrintLine = '';
      // Move to beginning of next line
      this.cursorX = 0;
      this.cursorY++;
      if (this.cursorY >= SCREEN_HEIGHT) {
        this.scrollUp();
        this.cursorY = SCREEN_HEIGHT - 1;
      }
    }
  }

  private getVariableType(name: string): 'number' | 'string' {
    // BASIC convention: $ suffix = string, otherwise number
    if (name.endsWith('$')) return 'string';
    if (name.endsWith('%') || name.endsWith('!') || name.endsWith('#')) return 'number';
    return 'number'; // default is numeric
  }

  private async executeInputStatement(stmt: InputStatement): Promise<void> {
    // LINE INPUT: read entire line without parsing commas
    if (stmt.lineInput) {
      return this.executeLineInput(stmt);
    }
    // Build prompt
    let prompt = '';
    if (stmt.prompt) {
      const promptValue = this.evaluateExpression(stmt.prompt);
      prompt = this.valueToString(promptValue);
      if (stmt.separator === ';') {
        // INPUT "nom"; n$ → no "?" added
      } else if (stmt.separator === ',') {
        // INPUT "nom", n$ → prompt + "? "
        prompt += '? ';
      } else {
        // No separator → default "? "
        prompt += '? ';
      }
    } else {
      prompt = '? ';
    }
    if (!this.inputCallback) {
      throw new Error('Input callback not set');
    }
    // Write prompt to buffer
    this.writeString(prompt);
    this.emitBuffer();
    const input = await this.inputCallback(prompt);
    // Write the input value to the buffer at the cursor position using current colors
    for (const ch of input) {
      this.writeChar(ch);
    }
    // Move cursor to next line after input
    this.cursorX = 0;
    this.cursorY++;
    if (this.cursorY >= SCREEN_HEIGHT) {
      this.scrollUp();
      this.cursorY = SCREEN_HEIGHT - 1;
    }
    this.emitBuffer();
    const values = input.split(',');
    for (let i = 0; i < stmt.variables.length && i < values.length; i++) {
      const varName = stmt.variables[i];
      const rawValue = values[i].trim();
      const varType = this.getVariableType(varName);
      if (varType === 'number') {
        const numValue = parseFloat(rawValue);
        if (isNaN(numValue)) {
          throw new Error(`?Redo from start (expected number for ${varName})`);
        }
        this.variables.set(varName, { type: 'number', value: numValue });
      } else {
        this.variables.set(varName, { type: 'string', value: rawValue });
      }
    }
  }

  private async executeLineInput(stmt: InputStatement): Promise<void> {
    // LINE INPUT reads entire line (no comma parsing)
    let prompt = '';
    if (stmt.prompt) {
      const promptValue = this.evaluateExpression(stmt.prompt);
      prompt = this.valueToString(promptValue);
    }
    if (!this.inputCallback) {
      throw new Error('Input callback not set');
    }
    this.writeString(prompt);
    this.emitBuffer();
    const input = await this.inputCallback(prompt);
    for (const ch of input) {
      this.writeChar(ch);
    }
    this.cursorX = 0;
    this.cursorY++;
    if (this.cursorY >= SCREEN_HEIGHT) {
      this.scrollUp();
      this.cursorY = SCREEN_HEIGHT - 1;
    }
    this.emitBuffer();
    // Assign entire input (with commas) to first variable only
    if (stmt.variables.length > 0) {
      const varName = stmt.variables[0];
      this.variables.set(varName, { type: 'string', value: input });
    }
  }

  private executeLetStatement(stmt: LetStatement): void {
    const value = this.evaluateExpression(stmt.value);
    if (typeof stmt.target === 'string') {
      this.variables.set(stmt.target, value);
    } else {
      const arrayAccess = stmt.target as ArrayAccess;
      const indices = arrayAccess.indices.map(idx => {
        const ev = this.evaluateExpression(idx);
        return typeof ev.value === 'number' ? Math.floor(ev.value) : 0;
      });
      const arrayKey = `${arrayAccess.name}[${indices.join(',')}]`;
      this.arrays.set(arrayKey, value);
    }
  }

  private async executeIfStatement(stmt: IfStatement): Promise<void> {
    const condition = this.evaluateExpression(stmt.condition);
    if (this.isTruthy(condition)) {
      for (const s of stmt.thenBranch) {
        await this.executeStatement(s);
      }
    } else if (stmt.elseBranch) {
      for (const s of stmt.elseBranch) {
        await this.executeStatement(s);
      }
    }
  }

  private async executeForStatement(stmt: ForStatement): Promise<void> {
    const startEval = this.evaluateExpression(stmt.start);
    const endEval = this.evaluateExpression(stmt.end);
    const start = typeof startEval.value === 'number' ? Math.floor(startEval.value) : 0;
    const end = typeof endEval.value === 'number' ? Math.floor(endEval.value) : 0;
    const step = stmt.step ? (() => {
      const s = this.evaluateExpression(stmt.step!);
      return typeof s.value === 'number' ? Math.floor(s.value) : 1;
    })() : 1;
    if (step === 0) throw new Error('FOR loop step cannot be zero');
    const maxCount = Math.abs(end - start) + 2;
    let count = 0;
    for (let i = start; (step > 0 ? i <= end : i >= end); i += step) {
      count++;
      if (count > maxCount || count > MAX_ITERATIONS) {
        throw new Error('FOR loop exceeded maximum iterations');
      }
      this.iterationCount++;
      if (this.iterationCount > MAX_ITERATIONS) {
        throw new Error('Program exceeded maximum iteration limit');
      }
      this.variables.set(stmt.variable, { type: 'number', value: i });
      for (const s of stmt.body) {
        await this.executeStatement(s);
      }
    }
  }

  private async executeWhileStatement(stmt: WhileStatement): Promise<void> {
    let count = 0;
    while (this.isTruthy(this.evaluateExpression(stmt.condition))) {
      count++;
      if (count > MAX_ITERATIONS) {
        throw new Error('WHILE loop exceeded maximum iterations');
      }
      this.iterationCount++;
      if (this.iterationCount > MAX_ITERATIONS) {
        throw new Error('Program exceeded maximum iteration limit');
      }
      for (const s of stmt.body) {
        await this.executeStatement(s);
      }
    }
  }

  private executeGosubStatement(stmt: GosubStatement): void {
    this.callStack.push(this.pc);
    this.pc = this.getTargetPc(stmt.label) - 1;
  }

  private executeReturnStatement(): void {
    if (this.callStack.length > 0) {
      this.pc = this.callStack.pop()!;
    }
  }

  private executeGotoStatement(stmt: GotoStatement): void {
    this.pc = this.getTargetPc(stmt.label) - 1;
  }

  private executeDimStatement(stmt: DimStatement): void {
    for (const arr of stmt.arrays) {
      const dimensions = arr.dimensions.map(d => {
        const ev = this.evaluateExpression(d);
        return typeof ev.value === 'number' ? Math.floor(ev.value) : 0;
      });
      this.arrays.set(arr.name, { type: 'array', value: { dimensions, data: {} } });
    }
  }

  private executeDataStatement(stmt: DataStatement): void {
    for (const value of stmt.values) {
      this.dataValues.push(value);
    }
  }

  private executeReadStatement(stmt: ReadStatement): void {
    for (const varName of stmt.variables) {
      if (this.dataIndex < this.dataValues.length) {
        const value = this.dataValues[this.dataIndex++];
        if (typeof value === 'number') {
          this.variables.set(varName, { type: 'number', value });
        } else {
          this.variables.set(varName, { type: 'string', value });
        }
      }
    }
  }

  private executeRestoreStatement(_stmt: RestoreStatement): void {
    this.dataIndex = 0;
  }

  private executeOnGotoStatement(stmt: OnGotoStatement): void {
    const value = Math.floor(this.toNumber(this.evaluateExpression(stmt.expression)));
    if (value >= 1 && value <= stmt.labels.length) {
      const label = stmt.labels[value - 1];
      this.pc = this.getTargetPc(label) - 1;
    }
  }

  private executeOnGosubStatement(stmt: OnGosubStatement): void {
    const value = Math.floor(this.toNumber(this.evaluateExpression(stmt.expression)));
    if (value >= 1 && value <= stmt.labels.length) {
      this.callStack.push(this.pc);
      const label = stmt.labels[value - 1];
      this.pc = this.getTargetPc(label) - 1;
    }
  }

  private executeWriteStatement(stmt: WriteStatement): void {
    let line = '';
    for (const expr of stmt.expressions) {
      const value = this.evaluateExpression(expr);
      if (value.type === 'string') {
        line += `"${value.value}"`;
      } else {
        line += this.valueToString(value);
      }
      line += ', ';
    }
    if (line.length > 2) line = line.slice(0, -2);
    this.writeString(line);
    this.cursorX = 0;
    this.cursorY++;
    if (this.cursorY >= SCREEN_HEIGHT) {
      this.scrollUp();
      this.cursorY = SCREEN_HEIGHT - 1;
    }
  }

  private executeLocateStatement(stmt: LocateStatement): void {
    const row = Math.floor(this.toNumber(this.evaluateExpression(stmt.row)));
    const col = stmt.column ? Math.floor(this.toNumber(this.evaluateExpression(stmt.column))) : 1;
    this.cursorY = Math.max(0, Math.min(SCREEN_HEIGHT - 1, row - 1));
    this.cursorX = Math.max(0, Math.min(SCREEN_WIDTH - 1, col - 1));
  }

  private executeColorStatement(stmt: ColorStatement): void {
    if (stmt.foreground) {
      this.currentFg = Math.floor(this.toNumber(this.evaluateExpression(stmt.foreground)));
    }
    if (stmt.background) {
      this.currentBg = Math.floor(this.toNumber(this.evaluateExpression(stmt.background)));
    }
  }

  private executeEraseStatement(stmt: EraseStatement): void {
    for (const varName of stmt.variables) {
      this.arrays.delete(varName);
    }
  }

  private executeDefFnStatement(stmt: DefFnStatement): void {
    const funcName = `FN_${stmt.name.toUpperCase()}`;
    this.variables.set(funcName, {
      type: 'string',
      value: JSON.stringify({ params: stmt.params, body: stmt.body })
    });
  }

  private async executeSelectCaseStatement(stmt: SelectCaseStatement): Promise<void> {
    const value = this.evaluateExpression(stmt.expression);
    for (const caseItem of stmt.cases) {
      for (const caseValue of caseItem.values) {
        const cv = this.evaluateExpression(caseValue);
        if (this.valueToString(value) === this.valueToString(cv)) {
          for (const s of caseItem.body) {
            await this.executeStatement(s);
          }
          return;
        }
      }
    }
    if (stmt.defaultCase) {
      for (const s of stmt.defaultCase) {
        await this.executeStatement(s);
      }
    }
  }

  private evaluateExpression(expr: Expression): RuntimeValue {
    switch (expr.type) {
      case 'NumberLiteral':
        return { type: 'number', value: (expr as NumberLiteral).value };
      case 'StringLiteral':
        return { type: 'string', value: (expr as StringLiteral).value };
      case 'Identifier': {
        const varName = (expr as Identifier).name;
        return this.variables.get(varName) || { type: 'number', value: 0 };
      }
      case 'BinaryOp':
        return this.evaluateBinaryOp(expr as BinaryOp);
      case 'UnaryOp':
        return this.evaluateUnaryOp(expr as UnaryOp);
      case 'FunctionCall':
        return this.evaluateFunctionCall(expr as FunctionCall);
      case 'ArrayAccess':
        return this.evaluateArrayAccess(expr as ArrayAccess);
      default:
        return { type: 'null', value: null };
    }
  }

  private toNumber(v: RuntimeValue): number {
    if (v.type === 'number') return v.value as number;
    if (v.type === 'string') return parseFloat(v.value as string) || 0;
    return 0;
  }

  private evaluateBinaryOp(expr: BinaryOp): RuntimeValue {
    const left = this.evaluateExpression(expr.left);
    const right = this.evaluateExpression(expr.right);
    switch (expr.operator) {
      case '+': {
        if (left.type === 'string' || right.type === 'string') {
          return { type: 'string', value: this.valueToString(left) + this.valueToString(right) };
        }
        return { type: 'number', value: this.toNumber(left) + this.toNumber(right) };
      }
      case '-':
        return { type: 'number', value: this.toNumber(left) - this.toNumber(right) };
      case '*':
        return { type: 'number', value: this.toNumber(left) * this.toNumber(right) };
      case '/': {
        const r = this.toNumber(right);
        if (r === 0) throw new Error('Division by zero');
        return { type: 'number', value: this.toNumber(left) / r };
      }
      case '^':
        return { type: 'number', value: Math.pow(this.toNumber(left), this.toNumber(right)) };
      case 'MOD':
        return { type: 'number', value: this.toNumber(left) % this.toNumber(right) };
      case '==':
      case '=': {
        const eq = this.valueToString(left) === this.valueToString(right);
        return { type: 'number', value: eq ? -1 : 0 };
      }
      case '<>': {
        const neq = this.valueToString(left) !== this.valueToString(right);
        return { type: 'number', value: neq ? -1 : 0 };
      }
      case '<':
        return { type: 'number', value: this.toNumber(left) < this.toNumber(right) ? -1 : 0 };
      case '>':
        return { type: 'number', value: this.toNumber(left) > this.toNumber(right) ? -1 : 0 };
      case '<=':
        return { type: 'number', value: this.toNumber(left) <= this.toNumber(right) ? -1 : 0 };
      case '>=':
        return { type: 'number', value: this.toNumber(left) >= this.toNumber(right) ? -1 : 0 };
      case 'AND':
        return { type: 'number', value: (this.isTruthy(left) && this.isTruthy(right)) ? -1 : 0 };
      case 'OR':
        return { type: 'number', value: (this.isTruthy(left) || this.isTruthy(right)) ? -1 : 0 };
      case 'XOR':
        return { type: 'number', value: (this.isTruthy(left) !== this.isTruthy(right)) ? -1 : 0 };
      default:
        return { type: 'null', value: null };
    }
  }

  private evaluateUnaryOp(expr: UnaryOp): RuntimeValue {
    const operand = this.evaluateExpression(expr.operand);
    switch (expr.operator) {
      case '-':
        return { type: 'number', value: -this.toNumber(operand) };
      case 'NOT':
        return { type: 'number', value: this.isTruthy(operand) ? 0 : -1 };
      default:
        return { type: 'null', value: null };
    }
  }

  private getNumericArg(args: RuntimeValue[], index: number): number {
    if (index >= args.length) return 0;
    return this.toNumber(args[index]);
  }

  private getStringArg(args: RuntimeValue[], index: number): string {
    if (index >= args.length) return '';
    return this.valueToString(args[index]);
  }

  private evaluateFunctionCall(expr: FunctionCall): RuntimeValue {
    const name = expr.name.toUpperCase();
    const args = expr.args.map(arg => this.evaluateExpression(arg));
    switch (name) {
      case 'ABS': return { type: 'number', value: Math.abs(this.getNumericArg(args, 0)) };
      case 'SIN': return { type: 'number', value: Math.sin(this.getNumericArg(args, 0)) };
      case 'COS': return { type: 'number', value: Math.cos(this.getNumericArg(args, 0)) };
      case 'TAN': return { type: 'number', value: Math.tan(this.getNumericArg(args, 0)) };
      case 'ATN': return { type: 'number', value: Math.atan(this.getNumericArg(args, 0)) };
      case 'EXP': return { type: 'number', value: Math.exp(this.getNumericArg(args, 0)) };
      case 'LOG': return { type: 'number', value: Math.log(this.getNumericArg(args, 0)) };
      case 'SQR': return { type: 'number', value: Math.sqrt(this.getNumericArg(args, 0)) };
      case 'INT': return { type: 'number', value: Math.floor(this.getNumericArg(args, 0)) };
      case 'FIX': return { type: 'number', value: Math.trunc(this.getNumericArg(args, 0)) };
      case 'CEIL': return { type: 'number', value: Math.ceil(this.getNumericArg(args, 0)) };
      case 'FLOOR': return { type: 'number', value: Math.floor(this.getNumericArg(args, 0)) };
      case 'SGN': {
        const n = this.getNumericArg(args, 0);
        return { type: 'number', value: n > 0 ? 1 : n < 0 ? -1 : 0 };
      }
      case 'RND': return { type: 'number', value: Math.random() };
      case 'CINT': return { type: 'number', value: Math.round(this.getNumericArg(args, 0)) };
      case 'CDBL': return { type: 'number', value: this.getNumericArg(args, 0) };
      case 'CSNG': return { type: 'number', value: this.getNumericArg(args, 0) };
      case 'LEN': return { type: 'number', value: this.getStringArg(args, 0).length };
      case 'ASC': return { type: 'number', value: this.getStringArg(args, 0).charCodeAt(0) || 0 };
      case 'CHR$': return { type: 'string', value: String.fromCharCode(this.getNumericArg(args, 0)) };
      case 'STR$': return { type: 'string', value: this.getStringArg(args, 0) };
      case 'VAL': return { type: 'number', value: parseFloat(this.getStringArg(args, 0)) || 0 };
      case 'LEFT$': return { type: 'string', value: this.getStringArg(args, 0).substring(0, this.getNumericArg(args, 1)) };
      case 'RIGHT$': {
        const rightStr = this.getStringArg(args, 0);
        const count = this.getNumericArg(args, 1);
        return { type: 'string', value: rightStr.substring(rightStr.length - count) };
      }
      case 'MID$': {
        const midStr = this.getStringArg(args, 0);
        const start = Math.max(0, Math.floor(this.getNumericArg(args, 1)) - 1);
        const length = args[2] ? Math.floor(this.getNumericArg(args, 2)) : midStr.length - start;
        return { type: 'string', value: midStr.substring(start, start + length) };
      }
      case 'INSTR': {
        if (args.length >= 3) {
          const s = this.getStringArg(args, 1).substring(Math.floor(this.getNumericArg(args, 0)) - 1);
          const f = this.getStringArg(args, 2);
          const pos = s.indexOf(f);
          return { type: 'number', value: pos >= 0 ? pos + Math.floor(this.getNumericArg(args, 0)) : 0 };
        } else {
          return { type: 'number', value: this.getStringArg(args, 0).indexOf(this.getStringArg(args, 1)) + 1 };
        }
      }
      case 'UPPER$': return { type: 'string', value: this.getStringArg(args, 0).toUpperCase() };
      case 'LOWER$': return { type: 'string', value: this.getStringArg(args, 0).toLowerCase() };
      case 'TRIM$': return { type: 'string', value: this.getStringArg(args, 0).trim() };
      case 'LTRIM$': return { type: 'string', value: this.getStringArg(args, 0).replace(/^\s+/, '') };
      case 'RTRIM$': return { type: 'string', value: this.getStringArg(args, 0).replace(/\s+$/, '') };
      case 'SPACE$': return { type: 'string', value: ' '.repeat(this.getNumericArg(args, 0)) };
      case 'STRING$': return { type: 'string', value: String.fromCharCode(this.getNumericArg(args, 1)).repeat(this.getNumericArg(args, 0)) };
      case 'HEX$': return { type: 'string', value: Math.floor(this.getNumericArg(args, 0)).toString(16).toUpperCase() };
      case 'OCT$': return { type: 'string', value: Math.floor(this.getNumericArg(args, 0)).toString(8) };
      case 'REPEAT$': return { type: 'string', value: this.getStringArg(args, 0).repeat(Math.floor(this.getNumericArg(args, 1))) };
      case 'REVERSE$': return { type: 'string', value: this.getStringArg(args, 0).split('').reverse().join('') };
      case 'TAB': return { type: 'string', value: ' '.repeat(Math.max(0, Math.floor(this.getNumericArg(args, 0)))) };
      case 'SPC': return { type: 'string', value: ' '.repeat(Math.floor(this.getNumericArg(args, 0))) };
      case 'RANDOMIZE': return { type: 'number', value: 0 };
      case 'TIMER': {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(0, 0, 0, 0);
        return { type: 'number', value: (now.getTime() - midnight.getTime()) / 1000 };
      }
      case 'DATE$': {
        const dateNow = new Date();
        const month = String(dateNow.getMonth() + 1).padStart(2, '0');
        const day = String(dateNow.getDate()).padStart(2, '0');
        const year = dateNow.getFullYear();
        return { type: 'string', value: `${month}-${day}-${year}` };
      }
      case 'TIME$': {
        const timeNow = new Date();
        const hours = String(timeNow.getHours()).padStart(2, '0');
        const minutes = String(timeNow.getMinutes()).padStart(2, '0');
        const seconds = String(timeNow.getSeconds()).padStart(2, '0');
        return { type: 'string', value: `${hours}:${minutes}:${seconds}` };
      }
      case 'MIN': {
        if (args.length === 0) throw new Error('MIN requires at least one argument');
        let min = this.toNumber(args[0]);
        for (let i = 1; i < args.length; i++) {
          const v = this.toNumber(args[i]);
          if (v < min) min = v;
        }
        return { type: 'number', value: min };
      }
      case 'MAX': {
        if (args.length === 0) throw new Error('MAX requires at least one argument');
        let max = this.toNumber(args[0]);
        for (let i = 1; i < args.length; i++) {
          const v = this.toNumber(args[i]);
          if (v > max) max = v;
        }
        return { type: 'number', value: max };
      }
      case 'MOYAR': {
        if (args.length === 0) throw new Error('MOYAR requires at least one argument');
        let sum = 0;
        for (let i = 0; i < args.length; i++) {
          sum += this.toNumber(args[i]);
        }
        return { type: 'number', value: sum / args.length };
      }
      case 'MOYPO': {
        // MOYPO(a1, p1, a2, p2, ...) — pairs of (value, weight)
        if (args.length < 2 || args.length % 2 !== 0) {
          throw new Error('MOYPO requires pairs of (value, weight)');
        }
        let weightedSum = 0;
        let totalWeight = 0;
        for (let i = 0; i < args.length; i += 2) {
          const val = this.toNumber(args[i]);
          const weight = this.toNumber(args[i + 1]);
          weightedSum += val * weight;
          totalWeight += weight;
        }
        if (totalWeight === 0) throw new Error('MOYPO total weight cannot be zero');
        return { type: 'number', value: weightedSum / totalWeight };
      }
      case 'SUM': {
        if (args.length === 0) throw new Error('SUM requires at least one argument');
        let sum = 0;
        for (let i = 0; i < args.length; i++) {
          sum += this.toNumber(args[i]);
        }
        return { type: 'number', value: sum };
      }
      case 'PROD': {
        if (args.length === 0) throw new Error('PROD requires at least one argument');
        let prod = 1;
        for (let i = 0; i < args.length; i++) {
          prod *= this.toNumber(args[i]);
        }
        return { type: 'number', value: prod };
      }
      case 'MEDIAN': {
        if (args.length === 0) throw new Error('MEDIAN requires at least one argument');
        const sorted = args.map(a => this.toNumber(a)).sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
          return { type: 'number', value: (sorted[mid - 1] + sorted[mid]) / 2 };
        } else {
          return { type: 'number', value: sorted[mid] };
        }
      }
      case 'STD': {
        if (args.length < 2) throw new Error('STD requires at least two arguments');
        const vals = args.map(a => this.toNumber(a));
        const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
        const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1);
        return { type: 'number', value: Math.sqrt(variance) };
      }
      case 'ARRPROCH': {
        // ARRPROCH(a1, p1, roundUp?) — round a1 to nearest multiple of p1
        // roundUp = TRUE (default): round UP to next multiple (ceil)
        // roundUp = FALSE: round DOWN to previous multiple (floor)
        if (args.length < 2) throw new Error('ARRPROCH requires at least two arguments');
        const value = this.toNumber(args[0]);
        const multiple = this.toNumber(args[1]);
        if (multiple === 0) throw new Error('ARRPROCH second argument (multiple) cannot be zero');
        // Default roundUp to TRUE if not specified or if args[2] is truthy
        const roundUp = args.length < 3 || this.isTruthy(args[2]);
        if (roundUp) {
          return { type: 'number', value: Math.ceil(value / multiple) * multiple };
        } else {
          return { type: 'number', value: Math.floor(value / multiple) * multiple };
        }
      }
      default:
        if (name.startsWith('FN_')) {
          const funcDef = this.variables.get(name);
          if (funcDef && funcDef.type === 'string') {
            const def = JSON.parse(funcDef.value as string);
            const savedVars = new Map(this.variables);
            for (let i = 0; i < def.params.length && i < args.length; i++) {
              this.variables.set(def.params[i], args[i]);
            }
            const result = this.evaluateExpression(def.body);
            this.variables = savedVars;
            return result;
          }
          throw new Error(`Undefined function: ${name}`);
        }
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private evaluateArrayAccess(expr: ArrayAccess): RuntimeValue {
    const indices = expr.indices.map(idx => {
      const ev = this.evaluateExpression(idx);
      return typeof ev.value === 'number' ? Math.floor(ev.value) : 0;
    });
    const arrayKey = `${expr.name}[${indices.join(',')}]`;
    const stored = this.arrays.get(arrayKey);
    return stored || { type: 'number', value: 0 };
  }

  private isTruthy(value: RuntimeValue): boolean {
    if (value.type === 'number') return value.value !== 0;
    if (value.type === 'string') return value.value !== '';
    return value.value !== null;
  }

  private valueToString(value: RuntimeValue): string {
    if (value.type === 'string') return value.value;
    if (value.type === 'number') return String(value.value);
    return '';
  }
}