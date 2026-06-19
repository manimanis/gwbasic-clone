// GWBASIC color palette (CGA 16 colors)
export const GWBASIC_COLORS: { [key: number]: string } = {
  0: '#000000', 1: '#0000AA', 2: '#00AA00', 3: '#00AAAA',
  4: '#AA0000', 5: '#AA00AA', 6: '#AA5500', 7: '#AAAAAA',
  8: '#555555', 9: '#5555FF', 10: '#55FF55', 11: '#55FFFF',
  12: '#FF5555', 13: '#FF55FF', 14: '#FFFF55', 15: '#FFFFFF',
};

export class TextCell {
  cell: number = 0;
  
  constructor(char: string = '\0', fg: number = 7, bg: number = 0) {
    this.setCell(char, fg, bg);
  }

  setCell(char: string, fg: number, bg: number): void {
    this.cell = (fg << 16) | (bg << 20) | char.charCodeAt(0);
  }

  getCell(): number {
    return this.cell;
  }

  getChar(): string {
    return String.fromCharCode(this.cell & 0xFFFF);
  }

  getForeColor(): number {
    return (this.cell >> 16) & 0xF;
  }

  getBackColor(): number {
    return (this.cell >> 20) & 0xF;
  }

  setChar(char: string): void {
    this.cell = (this.cell & 0xFFFF0000) | char.charCodeAt(0);
  }

  setForeColor(color: number): void {
    this.cell = (this.cell & 0xFFF0FFFF) | ((color & 0xF) << 16);
  }

  setBackColor(color: number): void {
    this.cell = (this.cell & 0xFF0FFFFF) | ((color & 0xF) << 20);
  }

  setColor(fg: number, bg: number): void {
    this.cell = (this.cell & 0xFF00FFFF) | ((fg & 0xF) << 16) | ((bg & 0xF) << 20);
  }
}

/**
 * Represents a text screen with a buffer and cursor.
 */
export class TextScreen {
  private width: number;
  private height: number;
  private buffer: TextCell[][] = [];
  private cursorX: number = 0;
  private cursorY: number = 0;
  private onUpdate?: () => void;

  constructor(width: number = 80, height: number = 24) {
    this.width = width;
    this.height = height;
    this.buffer = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => new TextCell())
    );
  }

  setOnUpdate(callback: () => void): void {
    this.onUpdate = callback;
  }

  clear(): void {
    this.buffer = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => new TextCell())
    );
    this.cursorX = 0;
    this.cursorY = 0;
  }

  /**
   * Converts the internal TextCell buffer to the legacy TerminalCell format
   * for backward compatibility with existing UI and tests.
   */
  toTerminalCells(): { char: string; fg: string; bg: string }[][] {
    return this.buffer.map(row =>
      row.map(cell => ({
        char: cell.getChar(),
        fg: GWBASIC_COLORS[cell.getForeColor()] || GWBASIC_COLORS[7],
        bg: GWBASIC_COLORS[cell.getBackColor()] || GWBASIC_COLORS[0],
      }))
    );
  }

  /**
   * Gets the width of the screen.
   * @returns The width of the screen.
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * Gets the height of the screen.
   * @returns The height of the screen.
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Gets the current cursor x position.
   * @returns The current cursor x position.
   */
  getCursorX(): number {
    return this.cursorX;
  }

  /**
   * Gets the current cursor y position.
   * @returns The current cursor y position.
   */
  getCursorY(): number {
    return this.cursorY;
  }

  /**
   * Sets the cursor position.
   * @param x The x coordinate.
   * @param y The y coordinate.
   */
  setCursor(x: number, y: number) {
    this.cursorX = x;
    this.cursorY = y;
  }

  /**
   * Gets the cell at the specified position.
   * @param x The x coordinate.
   * @param y The y coordinate.
   * @returns The cell at the specified position.
   */
  getCell(x: number | null = null, y: number | null = null): TextCell {
    const actualX = x ?? this.cursorX;
    const actualY = y ?? this.cursorY;
    return this.buffer[actualY][actualX];
  }

  /**
   * Gets the foreground color at the specified position.
   * @param x The x coordinate.
   * @param y The y coordinate.
   * @returns The foreground color at the specified position.
   */
  getForegroundColor(x: number | null = null, y: number | null = null): number {
    const actualX = x ?? this.cursorX;
    const actualY = y ?? this.cursorY;
    return this.buffer[actualY][actualX].getForeColor();
  }

  /**
   * Gets the background color at the specified position.
   * @param x The x coordinate.
   * @param y The y coordinate.
   * @returns The background color at the specified position.
   */
  getBackgroundColor(x: number | null = null, y: number | null = null): number {
    const actualX = x ?? this.cursorX;
    const actualY = y ?? this.cursorY;
    return this.buffer[actualY][actualX].getBackColor();
  }

  /**
   * Sets the color of the current cursor position.
   * @param fg The foreground color.
   * @param bg The background color.
   */
  setColor(fg: number, bg: number) {
    this.buffer[this.cursorY][this.cursorX].setColor(fg, bg);
  }

  /**
   * Adds a character to the screen at the current cursor position.
   * @param char The character to add.
   */
  addChar(char: string, fg: number = 7, bg: number = 0) {
    this.buffer[this.cursorY][this.cursorX].setCell(char, fg, bg);
    this.cursorX++;
    if (this.cursorX >= this.width) {
      this.cursorX = 0;
      this.cursorY++;
    }
    if (this.cursorY >= this.height) {
      this.scrollUp();
    }
    this.onUpdate?.();
  }

  /**
   * Adds a string to the screen at the current cursor position.
   * @param str The string to add.
   */
  addString(str: string) {
    const cursorCell = this.getCell(this.cursorX, this.cursorY);
    for (const char of str) {
      this.addChar(char, cursorCell.getForeColor(), cursorCell.getBackColor());
    }
  }

  /**
   * Scrolls the screen up by the specified number of lines.
   * @param lines The number of lines to scroll up.
   */
  private scrollUp(lines: number = 1) {
    const lastCell = this.buffer[this.buffer.length - 1][this.buffer[0].length - 1];
    this.buffer.splice(0, lines);
    for (let i = 0; i < lines; i++) {
      this.buffer.push(Array.from({ length: this.width }, () => new TextCell('\0', lastCell.getForeColor(), lastCell.getBackColor())));
    }
    this.cursorY = this.height - 1;
  }
}
