/**
 * Tests for date functions: MKDATE, YEAR, MONTH, DAY, DAYW, HOUR, MINUTE, SECONDS
 * And date arithmetic: date - date, date + number, date - number
 * And date string conversion: DATESTR$, TODATE
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { GWBASICInterpreter } from '../interpreter';

async function runProgram(code: string): Promise<string[]> {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const interpreter = new GWBASICInterpreter();
  await interpreter.execute(ast);
  return interpreter.getOutput();
}

/** Helper to create a Date object from components for test assertions */
function ts(year: number, month: number, day: number, h = 0, m = 0, s = 0): number {
  return Math.floor(new Date(year, month - 1, day, h, m, s).getTime() / 1000);
}

describe('Date functions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('MKDATE() returns system timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE()\n20 PRINT D');
    expect(output[0]).toBe(String(ts(2026, 6, 16, 6, 45, 30)));
  });

  it('MKDATE(2025) sets year, rest from system', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025)\n20 PRINT D');
    expect(output[0]).toBe(String(ts(2025, 6, 16, 6, 45, 30)));
  });

  it('MKDATE(2025, 4) sets year and month', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 4)\n20 PRINT D');
    expect(output[0]).toBe(String(ts(2025, 4, 16, 6, 45, 30)));
  });

  it('MKDATE(2025, 4, 15) sets year, month, day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 4, 15)\n20 PRINT D');
    expect(output[0]).toBe(String(ts(2025, 4, 15, 6, 45, 30)));
  });

  it('MKDATE(2025, 4, 15, 10) sets year, month, day, hour', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 4, 15, 10)\n20 PRINT D');
    expect(output[0]).toBe(String(ts(2025, 4, 15, 10, 45, 30)));
  });

  it('MKDATE(2025, 4, 15, 10, 30) sets year, month, day, hour, minute', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 4, 15, 10, 30)\n20 PRINT D');
    expect(output[0]).toBe(String(ts(2025, 4, 15, 10, 30, 30)));
  });

  it('MKDATE(2025, 4, 15, 10, 30, 55) sets all components', async () => {
    const output = await runProgram('10 D = MKDATE(2025, 4, 15, 10, 30, 55)\n20 PRINT D');
    expect(output[0]).toBe(String(ts(2025, 4, 15, 10, 30, 55)));
  });

  it('YEAR extracts year from MKDATE timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 8, 25, 14, 30, 45)\n20 PRINT YEAR(D)');
    expect(output[0]).toBe('2025');
  });

  it('MONTH extracts month from MKDATE timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 8, 25)\n20 PRINT MONTH(D)');
    expect(output[0]).toBe('8');
  });

  it('DAY extracts day from MKDATE timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 8, 25)\n20 PRINT DAY(D)');
    expect(output[0]).toBe('25');
  });

  it('DAYW returns day of week (0=Sunday)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30)); // Tuesday = 2

    const output = await runProgram('10 D = MKDATE()\n20 PRINT DAYW(D)');
    expect(output[0]).toBe('2');
  });

  it('HOUR extracts hour from MKDATE timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 8, 25, 14, 30, 45)\n20 PRINT HOUR(D)');
    expect(output[0]).toBe('14');
  });

  it('MINUTE extracts minute from MKDATE timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 8, 25, 14, 30, 45)\n20 PRINT MINUTE(D)');
    expect(output[0]).toBe('30');
  });

  it('SECONDS extracts seconds from MKDATE timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 8, 25, 14, 30, 45)\n20 PRINT SECONDS(D)');
    expect(output[0]).toBe('45');
  });

  it('Full date decomposition program', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram([
      '10 D = MKDATE(2025, 12, 25, 8, 30, 15)',
      '20 PRINT YEAR(D)',
      '30 PRINT MONTH(D)',
      '40 PRINT DAY(D)',
      '50 PRINT HOUR(D)',
      '60 PRINT MINUTE(D)',
      '70 PRINT SECONDS(D)',
    ].join('\n'));

    expect(output[0]).toBe('2025');
    expect(output[1]).toBe('12');
    expect(output[2]).toBe('25');
    expect(output[3]).toBe('8');
    expect(output[4]).toBe('30');
    expect(output[5]).toBe('15');
  });

  it('MKDATE returns a number (timestamp)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 0, 0, 0));

    const output = await runProgram('10 D = MKDATE(2025, 1, 1)\n20 PRINT D');
    const val = parseInt(output[0]);
    expect(val).toBe(ts(2025, 1, 1));
  });
});

describe('Date arithmetic', () => {
  it('date - date returns difference in seconds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram([
      '10 D1 = MKDATE(2025, 1, 1, 0, 0, 0)',
      '20 D2 = MKDATE(2025, 1, 2, 0, 0, 0)',
      '30 PRINT D2 - D1',
    ].join('\n'));
    expect(output[0]).toBe('86400');
  });

  it('date + number adds seconds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram([
      '10 D = MKDATE(2025, 1, 1, 12, 0, 0)',
      '20 D2 = D + 3600',
      '30 PRINT HOUR(D2)',
      '40 PRINT MINUTE(D2)',
    ].join('\n'));
    expect(output[0]).toBe('13');
    expect(output[1]).toBe('0');
  });

  it('date - number subtracts seconds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram([
      '10 D = MKDATE(2025, 1, 1, 12, 0, 0)',
      '20 D2 = D - 7200',
      '30 PRINT HOUR(D2)',
      '40 PRINT MINUTE(D2)',
    ].join('\n'));
    expect(output[0]).toBe('10');
    expect(output[1]).toBe('0');
  });

  it('difference of 7 days in seconds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram([
      '10 D1 = MKDATE(2025, 6, 1)',
      '20 D2 = MKDATE(2025, 6, 8)',
      '30 PRINT D2 - D1',
    ].join('\n'));
    expect(output[0]).toBe(String(7 * 86400));
  });

  it('add 1 day in seconds to a date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram([
      '10 D = MKDATE(2025, 3, 1)',
      '20 D2 = D + 86400',
      '30 PRINT YEAR(D2)',
      '40 PRINT MONTH(D2)',
      '50 PRINT DAY(D2)',
    ].join('\n'));
    expect(output[0]).toBe('2025');
    expect(output[1]).toBe('3');
    expect(output[2]).toBe('2');
  });
});

describe('Date string conversion', () => {
  it('DATESTR$ converts timestamp to ISO string', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 8, 25, 14, 30, 45)\n20 PRINT DATESTR$(D)');
    expect(output[0]).toBe('2025-08-25 14:30:45');
  });

  it('DATESTR$ pads single digits with zeros', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = MKDATE(2025, 3, 5, 9, 4, 7)\n20 PRINT DATESTR$(D)');
    expect(output[0]).toBe('2025-03-05 09:04:07');
  });

  it('TODATE converts ISO string to timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = TODATE("2025-08-25 14:30:45")\n20 PRINT D');
    expect(output[0]).toBe(String(ts(2025, 8, 25, 14, 30, 45)));
  });

  it('TODATE then DATESTR$ round-trips correctly', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram([
      '10 D = TODATE("2025-12-25 08:30:15")',
      '20 PRINT DATESTR$(D)',
    ].join('\n'));
    expect(output[0]).toBe('2025-12-25 08:30:15');
  });

  it('DATESTR$ then TODATE round-trips correctly', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram([
      '10 D = MKDATE(2025, 6, 15, 10, 30, 0)',
      '20 S$ = DATESTR$(D)',
      '30 D2 = TODATE(S$)',
      '40 PRINT D2 = D',
    ].join('\n'));
    expect(output[0]).toBe('-1');
  });

  it('TODATE with invalid string throws error', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 16, 6, 45, 30));

    const output = await runProgram('10 D = TODATE("invalid")\n20 PRINT D');
    const text = output.join(' ');
    expect(text).toContain('ERROR');
  });
});