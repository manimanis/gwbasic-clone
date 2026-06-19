import { describe, it, expect } from 'vitest';
import { TextCell, TextScreen } from '../screen';

describe('TextCell', () => {
  it('constructs with default values (null char, fg=7, bg=0)', () => {
    const cell = new TextCell();
    expect(cell.getChar()).toBe('\0');
    expect(cell.getForeColor()).toBe(7);
    expect(cell.getBackColor()).toBe(0);
  });

  it('constructs with custom char, fg, and bg', () => {
    const cell = new TextCell('A', 1, 2);
    expect(cell.getChar()).toBe('A');
    expect(cell.getForeColor()).toBe(1);
    expect(cell.getBackColor()).toBe(2);
  });

  it('setCell packs char, fg, and bg into the cell value', () => {
    const cell = new TextCell();
    cell.setCell('Z', 15, 8);
    expect(cell.getChar()).toBe('Z');
    expect(cell.getForeColor()).toBe(15);
    expect(cell.getBackColor()).toBe(8);
  });

  it('getCell returns the raw packed number', () => {
    const cell = new TextCell('X', 3, 5);
    const raw = cell.getCell();
    // Bits 0-15: char code, bits 16-19: fg, bits 20-23: bg
    expect(raw & 0xFFFF).toBe('X'.charCodeAt(0));
    expect((raw >> 16) & 0xF).toBe(3);
    expect((raw >> 20) & 0xF).toBe(5);
  });

  it('setChar updates only the character bits', () => {
    const cell = new TextCell('A', 4, 6);
    cell.setChar('B');
    expect(cell.getChar()).toBe('B');
    expect(cell.getForeColor()).toBe(4);
    expect(cell.getBackColor()).toBe(6);
  });

  it('setForeColor updates only the foreground color bits', () => {
    const cell = new TextCell('A', 4, 6);
    cell.setForeColor(9);
    expect(cell.getChar()).toBe('A');
    expect(cell.getForeColor()).toBe(9);
    expect(cell.getBackColor()).toBe(6);
  });

  it('setBackColor updates only the background color bits', () => {
    const cell = new TextCell('A', 4, 6);
    cell.setBackColor(12);
    expect(cell.getChar()).toBe('A');
    expect(cell.getForeColor()).toBe(4);
    expect(cell.getBackColor()).toBe(12);
  });

  it('setColor updates both fg and bg without changing char', () => {
    const cell = new TextCell('A', 4, 6);
    cell.setColor(1, 2);
    expect(cell.getChar()).toBe('A');
    expect(cell.getForeColor()).toBe(1);
    expect(cell.getBackColor()).toBe(2);
  });

  it('masks color values to 4 bits', () => {
    const cell = new TextCell('A', 0, 0);
    cell.setForeColor(0xFF);
    cell.setBackColor(0xFF);
    expect(cell.getForeColor()).toBe(0xF);
    expect(cell.getBackColor()).toBe(0xF);
  });

  it('handles multi-byte characters correctly via charCodeAt', () => {
    const cell = new TextCell('é', 7, 0);
    expect(cell.getChar()).toBe('é');
    expect(cell.getForeColor()).toBe(7);
    expect(cell.getBackColor()).toBe(0);
  });
});

describe('TextScreen', () => {
  it('constructs with default dimensions 80x24', () => {
    const screen = new TextScreen();
    expect(screen.getWidth()).toBe(80);
    expect(screen.getHeight()).toBe(24);
  });

  it('initializes cursor at (0, 0)', () => {
    const screen = new TextScreen();
    expect(screen.getCursorX()).toBe(0);
    expect(screen.getCursorY()).toBe(0);
  });

  it('setCursor updates cursor position', () => {
    const screen = new TextScreen();
    screen.setCursor(10, 5);
    expect(screen.getCursorX()).toBe(10);
    expect(screen.getCursorY()).toBe(5);
  });

  it('getCell returns the cell at cursor position by default', () => {
    const screen = new TextScreen();
    const cell = screen.getCell();
    expect(cell).toBeInstanceOf(TextCell);
    expect(cell.getChar()).toBe('\0');
  });

  it('getCell with explicit coordinates returns the correct cell', () => {
    const screen = new TextScreen();
    const cell = screen.getCell(5, 3);
    expect(cell).toBeInstanceOf(TextCell);
    // Modify that cell and verify
    cell.setCell('H', 14, 1);
    expect(screen.getCell(5, 3).getChar()).toBe('H');
    expect(screen.getCell(5, 3).getForeColor()).toBe(14);
    expect(screen.getCell(5, 3).getBackColor()).toBe(1);
  });

  it('getForegroundColor returns color at cursor by default', () => {
    const screen = new TextScreen();
    expect(screen.getForegroundColor()).toBe(7);
  });

  it('getBackgroundColor returns color at cursor by default', () => {
    const screen = new TextScreen();
    expect(screen.getBackgroundColor()).toBe(0);
  });

  it('getForegroundColor with coordinates returns correct color', () => {
    const screen = new TextScreen();
    screen.getCell(2, 2).setCell('X', 10, 3);
    expect(screen.getForegroundColor(2, 2)).toBe(10);
    expect(screen.getBackgroundColor(2, 2)).toBe(3);
  });

  it('setColor updates the cell at cursor position', () => {
    const screen = new TextScreen();
    screen.setColor(11, 4);
    expect(screen.getForegroundColor()).toBe(11);
    expect(screen.getBackgroundColor()).toBe(4);
  });

  it('addChar writes char and advances cursor', () => {
    const screen = new TextScreen();
    screen.addChar('A', 12, 1);
    expect(screen.getCell(0, 0).getChar()).toBe('A');
    expect(screen.getCell(0, 0).getForeColor()).toBe(12);
    expect(screen.getCell(0, 0).getBackColor()).toBe(1);
    expect(screen.getCursorX()).toBe(1);
    expect(screen.getCursorY()).toBe(0);
  });

  it('addChar wraps to next line when reaching end of line', () => {
    const screen = new TextScreen();
    screen.setCursor(79, 0);
    screen.addChar('X');
    expect(screen.getCursorX()).toBe(0);
    expect(screen.getCursorY()).toBe(1);
  });

  it('addChar scrolls up when reaching bottom of screen', () => {
    const screen = new TextScreen();
    screen.setCursor(0, 23);
    // Fill the last line completely to trigger scroll
    for (let i = 0; i < 80; i++) {
      screen.addChar('X');
    }
    expect(screen.getCursorY()).toBe(23);
    // The first line should have been scrolled away
    expect(screen.getCell(0, 0).getChar()).toBe('\0');
  });

  it('addString writes multiple characters preserving colors from current cell', () => {
    const screen = new TextScreen();
    screen.getCell(0, 0).setColor(13, 2);
    screen.addString('Hi');
    expect(screen.getCell(0, 0).getChar()).toBe('H');
    expect(screen.getCell(0, 0).getForeColor()).toBe(13);
    expect(screen.getCell(0, 0).getBackColor()).toBe(2);
    expect(screen.getCell(1, 0).getChar()).toBe('i');
    expect(screen.getCell(1, 0).getForeColor()).toBe(13);
    expect(screen.getCell(1, 0).getBackColor()).toBe(2);
    expect(screen.getCursorX()).toBe(2);
  });

  it('addString wraps and scrolls correctly', () => {
    const screen = new TextScreen();
    screen.setCursor(79, 0);
    screen.addString('AB');
    // 'A' at (79,0), 'B' wraps to (0,1)
    expect(screen.getCell(79, 0).getChar()).toBe('A');
    expect(screen.getCell(0, 1).getChar()).toBe('B');
    expect(screen.getCursorX()).toBe(1);
    expect(screen.getCursorY()).toBe(1);
  });

  it('buffer is 80 columns wide and 24 rows tall', () => {
    const screen = new TextScreen();
    expect(screen.getWidth()).toBe(80);
    expect(screen.getHeight()).toBe(24);
    // Access last cell to verify bounds
    const lastCell = screen.getCell(79, 23);
    expect(lastCell).toBeInstanceOf(TextCell);
  });
});