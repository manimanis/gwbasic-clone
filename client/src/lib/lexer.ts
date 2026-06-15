/**
 * GWBASIC Lexer - Tokenizes GWBASIC source code into tokens
 */
import { TokenType, type Token } from './types';
import { GWBASIC_KEYWORDS } from '@shared/gwbasic-constants';

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  private keywords: Record<string, TokenType>;

  constructor(input: string) {
    this.input = input;
    this.keywords = this.buildKeywordMap();
  }

  private buildKeywordMap(): Record<string, TokenType> {
    const map: Record<string, TokenType> = {};
    for (const kw of GWBASIC_KEYWORDS) {
      // Map keyword string to TokenType enum value
      const key = kw as keyof typeof TokenType;
      if (TokenType[key] !== undefined) {
        map[kw] = TokenType[key] as unknown as TokenType;
      }
    }
    // Add special overrides
    map['MOD'] = TokenType.MOD_OP;
    return map;
  }

  private currentChar(): string {
    if (this.position >= this.input.length) return '\0';
    return this.input[this.position];
  }

  private peekChar(offset: number = 1): string {
    const pos = this.position + offset;
    if (pos >= this.input.length) return '\0';
    return this.input[pos];
  }

  private advance(): void {
    if (this.currentChar() === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.position++;
  }

  private skipWhitespace(): void {
    while (this.currentChar() === ' ' || this.currentChar() === '\t') {
      this.advance();
    }
  }

  private readNumber(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let numStr = '';

    while (/[0-9.]/.test(this.currentChar())) {
      numStr += this.currentChar();
      this.advance();
    }

    // Handle scientific notation
    if (this.currentChar() === 'E' || this.currentChar() === 'e') {
      numStr += this.currentChar();
      this.advance();
      if (this.currentChar() === '+' || this.currentChar() === '-') {
        numStr += this.currentChar();
        this.advance();
      }
      while (/[0-9]/.test(this.currentChar())) {
        numStr += this.currentChar();
        this.advance();
      }
    }

    return {
      type: TokenType.NUMBER,
      value: parseFloat(numStr),
      line: startLine,
      column: startColumn,
    };
  }

  private readString(quote: string): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let str = '';
    this.advance(); // Skip opening quote

    while (this.currentChar() !== quote && this.currentChar() !== '\0') {
      if (this.currentChar() === '\\') {
        this.advance();
        switch (this.currentChar()) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case 'r': str += '\r'; break;
          case '\\': str += '\\'; break;
          case '"': str += '"'; break;
          case "'": str += "'"; break;
          default: str += this.currentChar();
        }
      } else {
        str += this.currentChar();
      }
      this.advance();
    }

    if (this.currentChar() === quote) {
      this.advance(); // Skip closing quote
    }

    return {
      type: TokenType.STRING,
      value: str,
      line: startLine,
      column: startColumn,
    };
  }

  private readIdentifier(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let identifier = '';

    while (/[A-Za-z0-9_$%!#]/.test(this.currentChar())) {
      identifier += this.currentChar();
      this.advance();
    }

    const upperIdent = identifier.toUpperCase();
    const type = this.keywords[upperIdent] || TokenType.IDENTIFIER;

    return {
      type,
      value: identifier,
      line: startLine,
      column: startColumn,
    };
  }

  public tokenize(): Token[] {
    this.tokens = [];

    while (this.currentChar() !== '\0') {
      this.skipWhitespace();

      if (this.currentChar() === '\0') break;

      const line = this.line;
      const column = this.column;

      // Comments
      if (this.currentChar() === "'" || (this.currentChar() === 'R' && this.peekChar() === 'E' && this.peekChar(2) === 'M')) {
        while (this.currentChar() !== '\n' && this.currentChar() !== '\0') {
          this.advance();
        }
        continue;
      }

      // Numbers
      if (/[0-9]/.test(this.currentChar())) {
        this.tokens.push(this.readNumber());
        continue;
      }

      // Strings
      if (this.currentChar() === '"' || this.currentChar() === "'") {
        this.tokens.push(this.readString(this.currentChar()));
        continue;
      }

      // Identifiers and keywords
      if (/[A-Za-z_]/.test(this.currentChar())) {
        this.tokens.push(this.readIdentifier());
        continue;
      }

      // Operators and delimiters
      switch (this.currentChar()) {
        case '+':
          this.tokens.push({ type: TokenType.PLUS, value: '+', line, column });
          this.advance();
          break;
        case '-':
          this.tokens.push({ type: TokenType.MINUS, value: '-', line, column });
          this.advance();
          break;
        case '*':
          this.tokens.push({ type: TokenType.MULTIPLY, value: '*', line, column });
          this.advance();
          break;
        case '/':
          this.tokens.push({ type: TokenType.DIVIDE, value: '/', line, column });
          this.advance();
          break;
        case '^':
          this.tokens.push({ type: TokenType.POWER, value: '^', line, column });
          this.advance();
          break;
        case '=':
          if (this.peekChar() === '=') {
            this.tokens.push({ type: TokenType.EQUALS, value: '==', line, column });
            this.advance();
            this.advance();
          } else {
            this.tokens.push({ type: TokenType.ASSIGN, value: '=', line, column });
            this.advance();
          }
          break;
        case '<':
          if (this.peekChar() === '=') {
            this.tokens.push({ type: TokenType.LESS_EQUAL, value: '<=', line, column });
            this.advance();
            this.advance();
          } else if (this.peekChar() === '>') {
            this.tokens.push({ type: TokenType.NOT_EQUALS, value: '<>', line, column });
            this.advance();
            this.advance();
          } else {
            this.tokens.push({ type: TokenType.LESS_THAN, value: '<', line, column });
            this.advance();
          }
          break;
        case '>':
          if (this.peekChar() === '=') {
            this.tokens.push({ type: TokenType.GREATER_EQUAL, value: '>=', line, column });
            this.advance();
            this.advance();
          } else {
            this.tokens.push({ type: TokenType.GREATER_THAN, value: '>', line, column });
            this.advance();
          }
          break;
        case '(':
          this.tokens.push({ type: TokenType.LPAREN, value: '(', line, column });
          this.advance();
          break;
        case ')':
          this.tokens.push({ type: TokenType.RPAREN, value: ')', line, column });
          this.advance();
          break;
        case ',':
          this.tokens.push({ type: TokenType.COMMA, value: ',', line, column });
          this.advance();
          break;
        case ';':
          this.tokens.push({ type: TokenType.SEMICOLON, value: ';', line, column });
          this.advance();
          break;
        case ':':
          this.tokens.push({ type: TokenType.COLON, value: ':', line, column });
          this.advance();
          break;
        case '#':
          this.tokens.push({ type: TokenType.HASH, value: '#', line, column });
          this.advance();
          break;
        case '$':
          this.tokens.push({ type: TokenType.DOLLAR, value: '$', line, column });
          this.advance();
          break;
        case '%':
          this.tokens.push({ type: TokenType.PERCENT, value: '%', line, column });
          this.advance();
          break;
        case '!':
          this.tokens.push({ type: TokenType.EXCLAIM, value: '!', line, column });
          this.advance();
          break;
        case '\n':
          this.tokens.push({ type: TokenType.NEWLINE, value: '\n', line, column });
          this.advance();
          break;
        default:
          this.tokens.push({ type: TokenType.UNKNOWN, value: this.currentChar(), line, column });
          this.advance();
      }
    }

    this.tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column });
    return this.tokens;
  }
}