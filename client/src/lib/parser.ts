/**
 * GWBASIC Parser - Parses tokens into an Abstract Syntax Tree (AST)
 */
import {
  TokenType,
  type Token,
  type Program,
  type Statement,
  type Expression,
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
  type RemStatement,
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
  type MidAssignStatement,
} from './types';
import { GWBASIC_FUNCTIONS, GWBASIC_NOARG_FUNCTIONS } from '@shared/gwbasic-constants';

export class Parser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private currentToken(): Token {
    if (this.position >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.position];
  }

  private peekToken(offset: number = 1): Token {
    const pos = this.position + offset;
    if (pos >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[pos];
  }

  private advance(): Token {
    const token = this.currentToken();
    if (this.currentToken().type !== TokenType.EOF) {
      this.position++;
    }
    return token;
  }

  private expect(type: TokenType): Token {
    if (this.currentToken().type !== type) {
      throw new Error(`Expected ${type}, got ${this.currentToken().type}`);
    }
    return this.advance();
  }

  private skipNewlines(): void {
    while (this.currentToken().type === TokenType.NEWLINE) {
      this.advance();
    }
  }

  public parse(): Program {
    const statements: Statement[] = [];
    while (this.currentToken().type !== TokenType.EOF) {
      this.skipNewlines();
      if (this.currentToken().type === TokenType.EOF) break;
      
      // Capture optional GWBASIC line numbers (e.g., "10 PRINT", "20 GOTO 60")
      let lineNumber: number | undefined;
      if (this.currentToken().type === TokenType.NUMBER && this.peekToken().type !== TokenType.EOF) {
        const peek = this.peekToken();
        // A line number is a number followed by a statement keyword or an identifier (assignment)
        // It's NOT a line number if followed by ASSIGN, PLUS, MINUS, etc.
        const isLineNumber = [
          TokenType.PRINT, TokenType.INPUT, TokenType.LET, TokenType.IF, TokenType.FOR,
          TokenType.WHILE, TokenType.GOSUB, TokenType.RETURN, TokenType.GOTO, TokenType.END,
          TokenType.DIM, TokenType.DATA, TokenType.READ, TokenType.RESTORE, TokenType.REM,
          TokenType.CLS, TokenType.RANDOMIZE, TokenType.IDENTIFIER,
        ].includes(peek.type);
        if (isLineNumber) {
          lineNumber = this.advance().value as number;
        }
      }
      
      const stmt = this.parseStatement();
      if (stmt) {
        stmt.line = lineNumber;
        statements.push(stmt);
      }
      while (this.currentToken().type === TokenType.NEWLINE || this.currentToken().type === TokenType.COLON) {
        this.advance();
      }
    }
    return { type: 'Program', statements };
  }

  private parseStatement(): Statement | null {
    const token = this.currentToken();
    switch (token.type) {
      case TokenType.PRINT: return this.parsePrintStatement();
      case TokenType.INPUT: return this.parseInputStatement();
      case TokenType.LET: return this.parseLetStatement();
      case TokenType.IF: return this.parseIfStatement();
      case TokenType.FOR: return this.parseForStatement();
      case TokenType.WHILE: return this.parseWhileStatement();
      case TokenType.GOSUB: return this.parseGosubStatement();
      case TokenType.RETURN: return this.parseReturnStatement();
      case TokenType.GOTO: return this.parseGotoStatement();
      case TokenType.END: return this.parseEndStatement();
      case TokenType.DIM: return this.parseDimStatement();
      case TokenType.DATA: return this.parseDataStatement();
      case TokenType.READ: return this.parseReadStatement();
      case TokenType.RESTORE: return this.parseRestoreStatement();
      case TokenType.REM: return this.parseRemStatement();
      case TokenType.SWAP: return this.parseSwapStatement();
      case TokenType.DO: return this.parseDoLoopStatement();
      case TokenType.EXIT: return this.parseExitStatement();
      case TokenType.ON: return this.parseOnStatement();
      case TokenType.WRITE: return this.parseWriteStatement();
      case TokenType.LOCATE: return this.parseLocateStatement();
      case TokenType.COLOR: return this.parseColorStatement();
      case TokenType.ERASE: return this.parseEraseStatement();
      case TokenType.DEF: return this.parseDefFnStatement();
      case TokenType.SELECT: return this.parseSelectCaseStatement();
      case TokenType.LINE: return this.parseLineInputStatement();
      case TokenType.RANDOMIZE: this.advance(); return { type: 'RandomizeStatement' } as Statement;
      case TokenType.CLS: this.advance(); return { type: 'ClsStatement' } as Statement;
      case TokenType.NEXT: this.advance(); return { type: 'NextStatement' } as Statement;
      case TokenType.WEND: this.advance(); return { type: 'WendStatement' } as Statement;
      case TokenType.IDENTIFIER: return this.parseIdentifierStatement();
      default: this.advance(); return null;
    }
  }

  private parsePrintStatement(): PrintStatement {
    this.expect(TokenType.PRINT);
    const expressions: (Expression | string)[] = [];
    let fileNumber: Expression | undefined;
    if (this.currentToken().type === TokenType.HASH) {
      this.advance();
      fileNumber = this.parseExpression();
      this.expect(TokenType.COMMA);
    }
    let using: Expression | undefined;
    if (this.currentToken().type === TokenType.USING) {
      this.advance();
      using = this.parseExpression();
      this.expect(TokenType.SEMICOLON);
    }
    if (this.currentToken().type !== TokenType.NEWLINE && this.currentToken().type !== TokenType.EOF && this.currentToken().type !== TokenType.COLON) {
      expressions.push(this.parseExpression());
      while (this.currentToken().type === TokenType.COMMA || this.currentToken().type === TokenType.SEMICOLON) {
        if (this.currentToken().type === TokenType.COMMA) expressions.push(',');
        else expressions.push(';');
        this.advance();
        if (this.currentToken().type !== TokenType.NEWLINE && this.currentToken().type !== TokenType.EOF && this.currentToken().type !== TokenType.COLON) {
          expressions.push(this.parseExpression());
        }
      }
    }
    return { type: 'PrintStatement', expressions, fileNumber, using };
  }

  private parseInputStatement(): InputStatement {
    this.expect(TokenType.INPUT);
    let prompt: Expression | undefined;
    let fileNumber: Expression | undefined;
    let separator: ';' | ',' | undefined;
    if (this.currentToken().type === TokenType.HASH) {
      this.advance();
      fileNumber = this.parseExpression();
      this.expect(TokenType.COMMA);
    }
    if (this.currentToken().type === TokenType.STRING) {
      prompt = this.parseExpression();
      if (this.currentToken().type === TokenType.SEMICOLON) {
        separator = ';';
        this.advance();
      } else if (this.currentToken().type === TokenType.COMMA) {
        separator = ',';
        this.advance();
      }
    }
    const variables: string[] = [];
    variables.push((this.expect(TokenType.IDENTIFIER).value as string));
    while (this.currentToken().type === TokenType.COMMA) {
      this.advance();
      variables.push((this.expect(TokenType.IDENTIFIER).value as string));
    }
    return { type: 'InputStatement', prompt, variables, fileNumber, separator };
  }

  private parseLetStatement(): LetStatement {
    this.expect(TokenType.LET);
    const target = this.currentToken().value as string;
    this.advance();
    let actualTarget: string | ArrayAccess = target;
    if (this.currentToken().type === TokenType.LPAREN) {
      this.advance();
      const indices: Expression[] = [];
      indices.push(this.parseExpression());
      while (this.currentToken().type === TokenType.COMMA) { this.advance(); indices.push(this.parseExpression()); }
      this.expect(TokenType.RPAREN);
      actualTarget = { type: 'ArrayAccess', name: target, indices } as ArrayAccess;
    }
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();
    return { type: 'LetStatement', target: actualTarget, value };
  }

  private parseIfStatement(): IfStatement {
    this.expect(TokenType.IF);
    const condition = this.parseExpression();
    this.expect(TokenType.THEN);
    const thenBranch: Statement[] = [];
    const elseBranch: Statement[] = [];

    if (this.currentToken().type !== TokenType.NEWLINE && this.currentToken().type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) {
        thenBranch.push(stmt);
        while (this.currentToken().type === TokenType.COLON) {
          this.advance();
          if (this.currentToken().type === TokenType.NEWLINE || this.currentToken().type === TokenType.EOF || this.currentToken().type === TokenType.ELSE) break;
          const ns = this.parseStatement();
          if (ns) thenBranch.push(ns);
        }
      }
      if (this.currentToken().type === TokenType.ELSE) {
        this.advance();
        const es = this.parseStatement();
        if (es) elseBranch.push(es);
        while (this.currentToken().type === TokenType.COLON) {
          this.advance();
          if (this.currentToken().type === TokenType.NEWLINE || this.currentToken().type === TokenType.EOF) break;
          const ns = this.parseStatement();
          if (ns) elseBranch.push(ns);
        }
      }
    } else {
      this.advance();
      while (this.currentToken().type !== TokenType.EOF && this.currentToken().type !== TokenType.ELSE && this.currentToken().type !== TokenType.END) {
        const s = this.parseStatement();
        if (s) thenBranch.push(s);
        while (this.currentToken().type === TokenType.NEWLINE || this.currentToken().type === TokenType.COLON) this.advance();
      }
      if (this.currentToken().type === TokenType.ELSE) {
        this.advance();
        while (this.currentToken().type === TokenType.NEWLINE || this.currentToken().type === TokenType.COLON) this.advance();
        while (this.currentToken().type !== TokenType.EOF && this.currentToken().type !== TokenType.END) {
          const s = this.parseStatement();
          if (s) elseBranch.push(s);
          while (this.currentToken().type === TokenType.NEWLINE || this.currentToken().type === TokenType.COLON) this.advance();
        }
      }
    }
    return { type: 'IfStatement', condition, thenBranch, elseBranch: elseBranch.length > 0 ? elseBranch : undefined };
  }

  private parseForStatement(): ForStatement {
    this.expect(TokenType.FOR);
    const variable = this.expect(TokenType.IDENTIFIER).value as string;
    this.expect(TokenType.ASSIGN);
    const start = this.parseExpression();
    this.expect(TokenType.TO);
    const end = this.parseExpression();
    let step: Expression | undefined;
    if (this.currentToken().type === TokenType.STEP) { this.advance(); step = this.parseExpression(); }
    this.skipNewlines();
    const body: Statement[] = [];
    while (this.currentToken().type !== TokenType.NEXT && this.currentToken().type !== TokenType.EOF) {
      // Capture line numbers in the loop body
      let lineNumber: number | undefined;
      if (this.currentToken().type === TokenType.NUMBER && this.peekToken().type !== TokenType.EOF) {
        const peek = this.peekToken();
        const isLineNumber = [
          TokenType.PRINT, TokenType.INPUT, TokenType.LET, TokenType.IF, TokenType.FOR,
          TokenType.WHILE, TokenType.GOSUB, TokenType.RETURN, TokenType.GOTO, TokenType.END,
          TokenType.DIM, TokenType.DATA, TokenType.READ, TokenType.RESTORE, TokenType.REM,
          TokenType.CLS, TokenType.RANDOMIZE, TokenType.IDENTIFIER,
        ].includes(peek.type);
        if (isLineNumber) {
          lineNumber = this.advance().value as number;
        }
      }
      const s = this.parseStatement();
      if (s) {
        s.line = lineNumber;
        body.push(s);
      }
      this.skipNewlines();
      while (this.currentToken().type === TokenType.COLON) this.advance();
      this.skipNewlines();
    }
    // Handle NEXT: if the next token is NEXT and the variable name matches (or there's a standalone NEXT),
    // consume it. For "NEXT J, I", if we're the inner loop (variable = "J"), consume only "NEXT J"
    // and leave the ", I" part for the outer loop.
    if (this.currentToken().type === TokenType.NEXT) {
      this.advance();
      // Check if variable name matches or it's a bare NEXT
      if (this.currentToken().type === TokenType.IDENTIFIER) {
        const nextVar = this.currentToken().value as string;
        if (nextVar.toUpperCase() === variable.toUpperCase()) {
          // This NEXT matches our variable → consume it
          this.advance();
          // Stop at comma - don't consume NEXT I, leave for outer loop
        }
        // If variable name doesn't match (e.g., outer loop sees NEXT I but expects J),
        // don't consume anything - it will be handled elsewhere
      }
    }
    return { type: 'ForStatement', variable, start, end, step, body };
  }

  private parseWhileStatement(): WhileStatement {
    this.expect(TokenType.WHILE);
    const condition = this.parseExpression();
    this.skipNewlines();
    const body: Statement[] = [];
    while (this.currentToken().type !== TokenType.WEND && this.currentToken().type !== TokenType.EOF) {
      const s = this.parseStatement();
      if (s) body.push(s);
      this.skipNewlines();
    }
    this.expect(TokenType.WEND);
    return { type: 'WhileStatement', condition, body };
  }

  private parseGosubStatement(): GosubStatement {
    this.expect(TokenType.GOSUB);
    const label = this.expect(TokenType.NUMBER).value as number;
    return { type: 'GosubStatement', label };
  }

  private parseReturnStatement(): ReturnStatement {
    this.expect(TokenType.RETURN);
    return { type: 'ReturnStatement' };
  }

  private parseGotoStatement(): GotoStatement {
    this.expect(TokenType.GOTO);
    const label = this.expect(TokenType.NUMBER).value as number;
    return { type: 'GotoStatement', label };
  }

  private parseEndStatement(): EndStatement {
    this.expect(TokenType.END);
    return { type: 'EndStatement' };
  }

  private parseDimStatement(): DimStatement {
    this.expect(TokenType.DIM);
    const arrays: Array<{ name: string; dimensions: Expression[] }> = [];
    do {
      if (this.currentToken().type === TokenType.COMMA) this.advance();
      const name = this.expect(TokenType.IDENTIFIER).value as string;
      this.expect(TokenType.LPAREN);
      const dimensions: Expression[] = [];
      dimensions.push(this.parseExpression());
      while (this.currentToken().type === TokenType.COMMA) { this.advance(); dimensions.push(this.parseExpression()); }
      this.expect(TokenType.RPAREN);
      arrays.push({ name, dimensions });
    } while (this.currentToken().type === TokenType.COMMA);
    return { type: 'DimStatement', arrays };
  }

  private parseDataStatement(): DataStatement {
    this.expect(TokenType.DATA);
    const values: (number | string)[] = [];
    do {
      if (this.currentToken().type === TokenType.COMMA) this.advance();
      if (this.currentToken().type === TokenType.NUMBER) values.push(this.advance().value as number);
      else if (this.currentToken().type === TokenType.STRING) values.push(this.advance().value as string);
      else if (this.currentToken().type === TokenType.IDENTIFIER) values.push(this.advance().value as string);
    } while (this.currentToken().type === TokenType.COMMA);
    return { type: 'DataStatement', values };
  }

  private parseReadStatement(): ReadStatement {
    this.expect(TokenType.READ);
    const variables: string[] = [];
    variables.push(this.expect(TokenType.IDENTIFIER).value as string);
    while (this.currentToken().type === TokenType.COMMA) { this.advance(); variables.push(this.expect(TokenType.IDENTIFIER).value as string); }
    return { type: 'ReadStatement', variables };
  }

  private parseRestoreStatement(): RestoreStatement {
    this.expect(TokenType.RESTORE);
    let label: number | undefined;
    if (this.currentToken().type === TokenType.NUMBER) label = this.advance().value as number;
    return { type: 'RestoreStatement', label };
  }

  private parseRemStatement(): RemStatement {
    this.expect(TokenType.REM);
    let comment = '';
    while (this.currentToken().type !== TokenType.NEWLINE && this.currentToken().type !== TokenType.EOF) {
      comment += this.currentToken().value;
      this.advance();
    }
    return { type: 'RemStatement', comment };
  }

  private parseSwapStatement(): Statement {
    this.expect(TokenType.SWAP);
    const var1 = this.expect(TokenType.IDENTIFIER).value as string;
    this.expect(TokenType.COMMA);
    const var2 = this.expect(TokenType.IDENTIFIER).value as string;
    return { type: 'SwapStatement', var1, var2 } as Statement;
  }

  private parseDoLoopStatement(): Statement {
    this.expect(TokenType.DO);
    let condition: Expression | undefined;
    let conditionType: 'while' | 'until' = 'while';
    let position: 'start' | 'end' = 'end';

    // DO WHILE condition or DO UNTIL condition
    if (this.currentToken().type === TokenType.WHILE) {
      this.advance();
      condition = this.parseExpression();
      conditionType = 'while';
      position = 'start';
    } else if (this.currentToken().type === TokenType.UNTIL) {
      this.advance();
      condition = this.parseExpression();
      conditionType = 'until';
      position = 'start';
    }
    this.skipNewlines();
    const body: Statement[] = [];
    while (this.currentToken().type !== TokenType.LOOP && this.currentToken().type !== TokenType.EOF) {
      const s = this.parseStatement();
      if (s) body.push(s);
      while (this.currentToken().type === TokenType.NEWLINE || this.currentToken().type === TokenType.COLON) this.advance();
    }
    this.expect(TokenType.LOOP);
    // LOOP WHILE or LOOP UNTIL (condition at the end)
    if (this.currentToken().type === TokenType.WHILE) {
      this.advance();
      condition = this.parseExpression();
      conditionType = 'while';
      position = 'end';
    } else if (this.currentToken().type === TokenType.UNTIL) {
      this.advance();
      condition = this.parseExpression();
      conditionType = 'until';
      position = 'end';
    }
    return { type: 'DoLoopStatement', condition: condition || { type: 'NumberLiteral', value: 1 } as Expression, conditionType, position, body } as Statement;
  }

  private parseExitStatement(): Statement {
    this.expect(TokenType.EXIT);
    const tokenType = this.currentToken().type;
    if (tokenType === TokenType.FOR || tokenType === TokenType.DO || tokenType === TokenType.WHILE) {
      const target = this.currentToken().value as string;
      this.advance();
      if (target === 'FOR' || tokenType === TokenType.FOR) return { type: 'ExitForStatement' };
      if (target === 'DO' || tokenType === TokenType.DO) return { type: 'ExitDoStatement' };
      if (target === 'WHILE' || tokenType === TokenType.WHILE) return { type: 'ExitWhileStatement' };
    }
    // EXIT with no loop type specified (BASIC convention)
    this.advance(); // consume the next token if it's not FOR/DO/WHILE
    return { type: 'ExitForStatement' };
  }

  private parseOnStatement(): Statement {
    this.expect(TokenType.ON);
    const expression = this.parseExpression();
    if (this.currentToken().type === TokenType.GOTO) {
      this.advance();
      const labels: number[] = [];
      labels.push(this.expect(TokenType.NUMBER).value as number);
      while (this.currentToken().type === TokenType.COMMA) {
        this.advance();
        labels.push(this.expect(TokenType.NUMBER).value as number);
      }
      return { type: 'OnGotoStatement', expression, labels } as Statement;
    } else if (this.currentToken().type === TokenType.GOSUB) {
      this.advance();
      const labels: number[] = [];
      labels.push(this.expect(TokenType.NUMBER).value as number);
      while (this.currentToken().type === TokenType.COMMA) {
        this.advance();
        labels.push(this.expect(TokenType.NUMBER).value as number);
      }
      return { type: 'OnGosubStatement', expression, labels } as Statement;
    }
    throw new Error('Expected GOTO or GOSUB after ON');
  }

  private parseWriteStatement(): Statement {
    this.expect(TokenType.WRITE);
    const expressions: Expression[] = [];
    if (this.currentToken().type !== TokenType.NEWLINE && this.currentToken().type !== TokenType.EOF && this.currentToken().type !== TokenType.COLON) {
      expressions.push(this.parseExpression());
      while (this.currentToken().type === TokenType.COMMA) {
        this.advance();
        if (this.currentToken().type !== TokenType.NEWLINE && this.currentToken().type !== TokenType.EOF && this.currentToken().type !== TokenType.COLON) {
          expressions.push(this.parseExpression());
        }
      }
    }
    return { type: 'WriteStatement', expressions } as Statement;
  }

  private parseLocateStatement(): Statement {
    this.expect(TokenType.LOCATE);
    const row = this.parseExpression();
    let column: Expression | undefined;
    if (this.currentToken().type === TokenType.COMMA) {
      this.advance();
      column = this.parseExpression();
    }
    return { type: 'LocateStatement', row, column } as Statement;
  }

  private parseColorStatement(): Statement {
    this.expect(TokenType.COLOR);
    let foreground: Expression | undefined;
    let background: Expression | undefined;
    if (this.currentToken().type !== TokenType.NEWLINE && this.currentToken().type !== TokenType.EOF && this.currentToken().type !== TokenType.COLON) {
      foreground = this.parseExpression();
      if (this.currentToken().type === TokenType.COMMA) {
        this.advance();
        background = this.parseExpression();
      }
    }
    return { type: 'ColorStatement', foreground, background } as Statement;
  }

  private parseEraseStatement(): Statement {
    this.expect(TokenType.ERASE);
    const variables: string[] = [];
    variables.push(this.expect(TokenType.IDENTIFIER).value as string);
    while (this.currentToken().type === TokenType.COMMA) {
      this.advance();
      variables.push(this.expect(TokenType.IDENTIFIER).value as string);
    }
    return { type: 'EraseStatement', variables } as Statement;
  }

  private parseDefFnStatement(): Statement {
    this.expect(TokenType.DEF);
    this.expect(TokenType.FN);
    const name = this.expect(TokenType.IDENTIFIER).value as string;
    this.expect(TokenType.LPAREN);
    const params: string[] = [];
    if (this.currentToken().type !== TokenType.RPAREN) {
      params.push(this.expect(TokenType.IDENTIFIER).value as string);
      while (this.currentToken().type === TokenType.COMMA) {
        this.advance();
        params.push(this.expect(TokenType.IDENTIFIER).value as string);
      }
    }
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.ASSIGN);
    const body = this.parseExpression();
    return { type: 'DefFnStatement', name, params, body } as Statement;
  }

  private parseSelectCaseStatement(): Statement {
    this.expect(TokenType.SELECT);
    this.expect(TokenType.CASE);
    const expression = this.parseExpression();
    this.skipNewlines();
    const cases: Array<{ values: Expression[]; body: Statement[] }> = [];
    let defaultCase: Statement[] | undefined;
    while (this.currentToken().type !== TokenType.END && this.currentToken().type !== TokenType.EOF) {
      if (this.currentToken().type === TokenType.CASE) {
        this.advance();
        if (this.currentToken().type === TokenType.ELSE) {
          this.advance();
          const body: Statement[] = [];
          this.skipNewlines();
          while (this.currentToken().type !== TokenType.CASE && this.currentToken().type !== TokenType.END && this.currentToken().type !== TokenType.EOF) {
            const s = this.parseStatement();
            if (s) body.push(s);
            while (this.currentToken().type === TokenType.NEWLINE || this.currentToken().type === TokenType.COLON) this.advance();
          }
          defaultCase = body;
        } else {
          const values: Expression[] = [];
          values.push(this.parseExpression());
          while (this.currentToken().type === TokenType.COMMA) {
            this.advance();
            values.push(this.parseExpression());
          }
          const body: Statement[] = [];
          this.skipNewlines();
          while (this.currentToken().type !== TokenType.CASE && this.currentToken().type !== TokenType.END && this.currentToken().type !== TokenType.EOF) {
            const s = this.parseStatement();
            if (s) body.push(s);
            while (this.currentToken().type === TokenType.NEWLINE || this.currentToken().type === TokenType.COLON) this.advance();
          }
          cases.push({ values, body });
        }
      } else {
        this.advance();
      }
    }
    if (this.currentToken().type === TokenType.END) {
      this.advance();
      if (this.currentToken().type === TokenType.SELECT) this.advance();
    }
    return { type: 'SelectCaseStatement', expression, cases, defaultCase } as Statement;
  }

  private parseLineInputStatement(): Statement {
    this.expect(TokenType.LINE);
    this.expect(TokenType.INPUT);
    let prompt: Expression | undefined;
    if (this.currentToken().type === TokenType.STRING) {
      prompt = this.parseExpression();
      if (this.currentToken().type === TokenType.SEMICOLON) this.advance();
      else if (this.currentToken().type === TokenType.COMMA) this.advance();
    }
    const variables: string[] = [];
    variables.push(this.expect(TokenType.IDENTIFIER).value as string);
    while (this.currentToken().type === TokenType.COMMA) {
      this.advance();
      variables.push(this.expect(TokenType.IDENTIFIER).value as string);
    }
    return { type: 'InputStatement', prompt, variables, lineInput: true } as Statement;
  }

  private parseIdentifierStatement(): Statement | null {
    const name = this.currentToken().value as string;
    this.advance();
    if (this.currentToken().type === TokenType.LPAREN) {
      this.advance();
      const indices: Expression[] = [];
      indices.push(this.parseExpression());
      while (this.currentToken().type === TokenType.COMMA) { this.advance(); indices.push(this.parseExpression()); }
      this.expect(TokenType.RPAREN);
      if (this.currentToken().type === TokenType.ASSIGN) {
        // Check if this is a MID$ assignment: MID$(string, start, length) = value
        if (name.toUpperCase() === 'MID$') {
          this.advance();
          const value = this.parseExpression();
          // Extract the string variable name from the first argument (should be an Identifier)
          const stringVarExpr = indices[0];
          let stringVarName = '';
          if (stringVarExpr.type === 'Identifier' && 'name' in stringVarExpr) {
            stringVarName = (stringVarExpr as Identifier).name;
          } else if (stringVarExpr.type === 'ArrayAccess' && 'name' in stringVarExpr) {
            stringVarName = (stringVarExpr as ArrayAccess).name;
          }
          return { type: 'MidAssignStatement', stringVar: stringVarName, start: indices[1], length: indices[2], value } as MidAssignStatement;
        }
        this.advance();
        const value = this.parseExpression();
        return { type: 'LetStatement', target: { type: 'ArrayAccess', name, indices } as ArrayAccess, value } as LetStatement;
      }
      // If we have identifier(...) without ASSIGN, it's a function call or array access - not a statement
      this.position -= indices.length + 3; // Backtrack
      return null;
    }
    if (this.currentToken().type === TokenType.ASSIGN) {
      this.advance();
      const value = this.parseExpression();
      return { type: 'LetStatement', target: name, value } as LetStatement;
    }
    return null;
  }

  private parseMidAssignStatement(stringVar: string): MidAssignStatement {
    this.expect(TokenType.LPAREN);
    const start = this.parseExpression();
    this.expect(TokenType.COMMA);
    const length = this.parseExpression();
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();
    return { type: 'MidAssignStatement', stringVar, start, length, value };
  }

  private parseExpression(): Expression { return this.parseLogicalOr(); }
  private parseLogicalOr(): Expression {
    let left = this.parseLogicalAnd();
    while (this.currentToken().type === TokenType.OR) {
      const op = this.advance().value as string;
      const right = this.parseLogicalAnd();
      left = { type: 'BinaryOp', operator: op, left, right } as BinaryOp;
    }
    return left;
  }
  private parseLogicalAnd(): Expression {
    let left = this.parseLogicalXor();
    while (this.currentToken().type === TokenType.AND) {
      const op = this.advance().value as string;
      const right = this.parseLogicalXor();
      left = { type: 'BinaryOp', operator: op, left, right } as BinaryOp;
    }
    return left;
  }
  private parseLogicalXor(): Expression {
    let left = this.parseComparison();
    while (this.currentToken().type === TokenType.XOR) {
      const op = this.advance().value as string;
      const right = this.parseComparison();
      left = { type: 'BinaryOp', operator: op, left, right } as BinaryOp;
    }
    return left;
  }
  private parseComparison(): Expression {
    let left = this.parseAddition();
    while ([TokenType.EQUALS, TokenType.ASSIGN, TokenType.NOT_EQUALS, TokenType.LESS_THAN, TokenType.GREATER_THAN, TokenType.LESS_EQUAL, TokenType.GREATER_EQUAL].includes(this.currentToken().type)) {
      const op = this.advance().value as string;
      const right = this.parseAddition();
      left = { type: 'BinaryOp', operator: op, left, right } as BinaryOp;
    }
    return left;
  }
  private parseAddition(): Expression {
    let left = this.parseMultiplication();
    while (this.currentToken().type === TokenType.PLUS || this.currentToken().type === TokenType.MINUS) {
      const op = this.advance().value as string;
      const right = this.parseMultiplication();
      left = { type: 'BinaryOp', operator: op, left, right } as BinaryOp;
    }
    return left;
  }
  private parseMultiplication(): Expression {
    let left = this.parsePower();
    while (this.currentToken().type === TokenType.MULTIPLY || this.currentToken().type === TokenType.DIVIDE || this.currentToken().type === TokenType.MOD_OP) {
      const op = this.advance().value as string;
      const right = this.parsePower();
      left = { type: 'BinaryOp', operator: op, left, right } as BinaryOp;
    }
    return left;
  }
  private parsePower(): Expression {
    let left = this.parseUnary();
    while (this.currentToken().type === TokenType.POWER) {
      const op = this.advance().value as string;
      const right = this.parseUnary();
      left = { type: 'BinaryOp', operator: op, left, right } as BinaryOp;
    }
    return left;
  }
  private parseUnary(): Expression {
    if (this.currentToken().type === TokenType.NOT || this.currentToken().type === TokenType.MINUS) {
      const op = this.advance().value as string;
      const opd = this.parseUnary();
      return { type: 'UnaryOp', operator: op, operand: opd } as UnaryOp;
    }
    return this.parsePrimary();
  }
  private parsePrimary(): Expression {
    const token = this.currentToken();
    if (token.type === TokenType.NUMBER) { this.advance(); return { type: 'NumberLiteral', value: token.value as number } as NumberLiteral; }
    if (token.type === TokenType.STRING) { this.advance(); return { type: 'StringLiteral', value: token.value as string } as StringLiteral; }
    if (token.type === TokenType.IDENTIFIER || token.type === TokenType.FN) {
      let name: string;
      if (token.type === TokenType.FN) {
        // FN FUNCNAME(args) - read the function name after FN
        this.advance();
        const funcName = this.expect(TokenType.IDENTIFIER).value as string;
        name = `FN_${funcName.toUpperCase()}`;
      } else {
        name = token.value as string;
        this.advance();
      }
      if (this.currentToken().type === TokenType.LPAREN) {
        this.advance();
        const args: Expression[] = [];
        if (this.currentToken().type !== TokenType.RPAREN) {
          args.push(this.parseExpression());
          while (this.currentToken().type === TokenType.COMMA) { this.advance(); args.push(this.parseExpression()); }
        }
        this.expect(TokenType.RPAREN);
        if (GWBASIC_FUNCTIONS.includes(name.toUpperCase()) || name.startsWith('FN_')) return { type: 'FunctionCall', name, args } as FunctionCall;
        return { type: 'ArrayAccess', name, indices: args } as ArrayAccess;
      }
      if (GWBASIC_NOARG_FUNCTIONS.includes(name.toUpperCase())) return { type: 'FunctionCall', name, args: [] } as FunctionCall;
      return { type: 'Identifier', name } as Identifier;
    }
    if (token.type === TokenType.LPAREN) { this.advance(); const expr = this.parseExpression(); this.expect(TokenType.RPAREN); return expr; }
    throw new Error(`Unexpected token: ${token.type}`);
  }
}