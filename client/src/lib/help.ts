/**
 * GWBASIC Help Documentation
 * Reference guide for supported functions and statements
 */

export const HELP = {
introduction: `
GWBASIC Interpreter - Complete Reference

This is a functional GWBASIC interpreter implemented in JavaScript.
It supports the vast majority of GWBASIC functions and statements.

QUICK START:
1. Type your BASIC program in the editor
2. Click RUN to execute
3. Output appears in the terminal

PROGRAM STRUCTURE:
- Each line starts with a line number (10, 20, 30, etc.)
- Statements are separated by colons (:)
- Comments start with REM or '

EXAMPLE:
10 PRINT "Hello, World!"
20 FOR I = 1 TO 5
30 PRINT I
40 NEXT I
50 END

DEVELOPMENT TOOLS:
- LINTER: Static analysis with real-time error detection (E001-E040, W001-W004)
- RENUMBER (F6): Reorganize line numbers automatically
- AUTO-FIX: Fix keyword casing and indentation (TOOLS > AUTO-FIX)
`,

  statements: {
    PRINT: `PRINT - Output text to terminal
Syntax: PRINT expression [; expression] [,]
Examples:
  PRINT "Hello"
  PRINT X
  PRINT "X = "; X
  PRINT "Tab"; TAB(20); "here"
  PRINT 1; 2; 3  ' Semicolon suppresses newline
`,

    INPUT: `INPUT - Read user input
Syntax: INPUT ["prompt";] variable [, variable]
Examples:
  INPUT X
  INPUT "Enter name: "; N$
  INPUT A, B, C
  ' ; separator = no "?" after prompt
  ' , separator = adds "?" after prompt
`,

    'LINE INPUT': `LINE INPUT - Read entire line (no comma parsing)
Syntax: LINE INPUT variable$
Examples:
  LINE INPUT A$
  ' Commas are preserved in the input
`,

    LET: `LET - Assign value to variable
Syntax: [LET] variable = expression
Examples:
  LET X = 10
  X = 10
  A(1) = 5
`,

    IF: `IF - Conditional execution
Syntax: IF condition THEN statement [ELSE statement]
Examples:
  IF X > 5 THEN PRINT "Greater"
  IF X > 5 THEN PRINT "Greater" ELSE PRINT "Less"
`,

    FOR: `FOR - Loop counter
Syntax: FOR variable = start TO end [STEP increment]
        ... statements ...
        NEXT variable
Examples:
  FOR I = 1 TO 10
  PRINT I
  NEXT I
  FOR I = 10 TO 1 STEP -1  ' Countdown
`,

    WHILE: `WHILE - Conditional loop
Syntax: WHILE condition
        ... statements ...
        WEND
Examples:
  WHILE X < 10
  PRINT X
  X = X + 1
  WEND
`,

    'DO...LOOP': `DO LOOP - Post-condition loop
Syntax: DO WHILE condition ... LOOP
        DO UNTIL condition ... LOOP
        DO ... LOOP WHILE condition
        DO ... LOOP UNTIL condition
Examples:
  I = 1
  DO WHILE I <= 5
    PRINT I
    I = I + 1
  LOOP
`,

    GOSUB: `GOSUB - Call subroutine
Syntax: GOSUB line_number
        ... later ...
        line_number: ... statements ...
        RETURN
`,

    GOTO: `GOTO - Jump to line
Syntax: GOTO line_number
Examples:
  GOTO 100
`,

    END: `END - Terminate program
Syntax: END
`,

    DIM: `DIM - Declare array
Syntax: DIM array(size) [, array(size)]
Examples:
  DIM A(10)
  DIM B(5), C(3)
`,

    ERASE: `ERASE - Delete array
Syntax: ERASE array_name
Examples:
  ERASE A
`,

    DATA: `DATA - Store data values
Syntax: DATA value [, value]
Examples:
  DATA 10, 20, 30
`,

    READ: `READ - Read DATA values
Syntax: READ variable [, variable]
Examples:
  READ A, B, C
`,

    RESTORE: `RESTORE - Reset DATA pointer
Syntax: RESTORE
  ' Resets the read pointer to the first DATA statement
`,

    SWAP: `SWAP - Exchange two variables
Syntax: SWAP variable1, variable2
Examples:
  SWAP A, B
  SWAP A$, B$
`,

    LOCATE: `LOCATE - Position cursor
Syntax: LOCATE row [, column]
  Row and column are 1-based.
Examples:
  LOCATE 5, 10
  PRINT "At row 5, col 10"
`,

    COLOR: `COLOR - Set text colors
Syntax: COLOR foreground [, background]
  Colors: 0=Black 1=Blue 2=Green 3=Cyan
          4=Red 5=Magenta 6=Brown 7=White
          8=Gray 9=LightBlue 10=LightGreen 11=LightCyan
          12=LightRed 13=LightMagenta 14=Yellow 15=BrightWhite
Examples:
  COLOR 14        ' Yellow text
  COLOR 10, 0     ' Green on black
`,

    REM: `REM - Comment
Syntax: REM comment text
        or ' comment text
Examples:
  REM This is a comment
  ' This is also a comment
`,

    CLS: `CLS - Clear screen
Syntax: CLS
`,

    'SELECT CASE': `SELECT CASE - Multi-way conditional
Syntax: SELECT CASE expression
          CASE value1 [, value2]
            statements
          CASE ELSE
            statements
        END SELECT
Examples:
  SELECT CASE X
    CASE 1
      PRINT "One"
    CASE 2, 3
      PRINT "Two or Three"
    CASE ELSE
      PRINT "Other"
  END SELECT
`,

    'DEF FN': `DEF FN - User-defined function
Syntax: DEF FN name(params) = expression
Examples:
  DEF FN DOUBLE(X) = X * 2
  PRINT FN DOUBLE(5)  ' Output: 10
`,

    'ON...GOTO': `ON...GOTO - Computed jump
Syntax: ON expression GOTO label1, label2, ...
Examples:
  ON X GOTO 10, 20, 30
`,

    'ON...GOSUB': `ON...GOSUB - Computed subroutine call
Syntax: ON expression GOSUB label1, label2, ...
Examples:
  ON X GOSUB 10, 20, 30
`,
  },

  functions: {
    ABS: `ABS(x) - Absolute value
Returns the absolute value of x
Example: PRINT ABS(-5)  ' Output: 5`,

    SIN: `SIN(x) - Sine function
Returns sine of x (in radians)
Example: PRINT SIN(1.57)  ' Output: ~1`,

    COS: `COS(x) - Cosine function
Returns cosine of x (in radians)
Example: PRINT COS(0)  ' Output: 1`,

    TAN: `TAN(x) - Tangent function
Returns tangent of x (in radians)`,

    ATN: `ATN(x) - Arctangent function
Returns arctangent of x (in radians)`,

    ATAN2: `ATAN2(y, x) - Two-argument arctangent
Returns the angle (in radians) between the positive x-axis and the point (x, y).
Range: -PI to +PI
Example: PRINT ATAN2(1, 1)  ' Output: ~0.785 (PI/4)`,

    DEGTORAD: `DEGTORAD(deg) - Convert degrees to radians
Returns the angle in radians.
Example: PRINT DEGTORAD(180)  ' Output: ~3.14159`,

    RADTODEG: `RADTODEG(rad) - Convert radians to degrees
Returns the angle in degrees.
Example: PRINT RADTODEG(PI)  ' Output: 180`,

    EXP: `EXP(x) - Exponential function
Returns e^x`,

    LOG: `LOG(x) - Natural logarithm
Returns natural logarithm of x`,

    SQR: `SQR(x) - Square root
Returns square root of x
Example: PRINT SQR(16)  ' Output: 4`,

    INT: `INT(x) - Integer part (floor)
Returns the largest integer <= x
Example: PRINT INT(3.7)  ' Output: 3`,

    FIX: `FIX(x) - Integer part (truncation)
Returns x truncated toward zero
Example: PRINT FIX(-3.7)  ' Output: -3`,

    CEIL: `CEIL(x) - Ceiling
Returns the smallest integer >= x
Example: PRINT CEIL(1.2)  ' Output: 2`,

    FLOOR: `FLOOR(x) - Floor
Returns the largest integer <= x
Example: PRINT FLOOR(1.8)  ' Output: 1`,

    SGN: `SGN(x) - Sign
Returns 1 if x > 0, 0 if x = 0, -1 if x < 0
Example: PRINT SGN(-5)  ' Output: -1`,

    RND: `RND - Random number
Returns random number between 0 and 1
Example: PRINT INT(RND * 100)  ' Random 0-99`,

    CINT: `CINT(x) - Round to integer
Rounds x to the nearest integer
Example: PRINT CINT(3.5)  ' Output: 4`,

    LEN: `LEN(string) - String length
Returns length of string
Example: PRINT LEN("Hello")  ' Output: 5`,

    ASC: `ASC(string) - ASCII code
Returns ASCII code of first character
Example: PRINT ASC("A")  ' Output: 65`,

    CHR: `CHR$(code) - Character from code
Returns character from ASCII code
Example: PRINT CHR$(65)  ' Output: A`,

    STR: `STR$(number) - Number to string
Converts number to string
Example: PRINT STR$(123)  ' Output: "123"`,

    VAL: `VAL(string) - String to number
Converts string to number
Example: PRINT VAL("123")  ' Output: 123`,

    LEFT: `LEFT$(string, length) - Left substring
Returns leftmost characters
Example: PRINT LEFT$("Hello", 2)  ' Output: "He"`,

    RIGHT: `RIGHT$(string, length) - Right substring
Returns rightmost characters
Example: PRINT RIGHT$("Hello", 2)  ' Output: "lo"`,

    MID: `MID$(string, start, length) - Middle substring
Returns substring starting at position
Example: PRINT MID$("Hello", 2, 3)  ' Output: "ell"`,

    INSTR: `INSTR(string, substring) - Find substring
Returns position of substring (1-based)
Example: PRINT INSTR("Hello", "ll")  ' Output: 3`,

    UPPER: `UPPER$(string) - Convert to uppercase
Example: PRINT UPPER$("hello")  ' Output: "HELLO"`,

    LOWER: `LOWER$(string) - Convert to lowercase
Example: PRINT LOWER$("HELLO")  ' Output: "hello"`,

    TRIM: `TRIM$(string) - Remove leading/trailing spaces
Example: PRINT TRIM$("  hi  ")  ' Output: "hi"`,

    SPACE: `SPACE$(count) - Spaces
Returns string of spaces
Example: PRINT "A"; SPACE$(5); "B"`,

    STRING: `STRING$(count, char) - Repeated character
Returns character repeated count times
Example: PRINT STRING$(5, "*")  ' Output: "*****"`,

    HEX: `HEX$(number) - Hexadecimal
Returns hexadecimal representation
Example: PRINT HEX$(255)  ' Output: "FF"`,

    OCT: `OCT$(number) - Octal
Returns octal representation
Example: PRINT OCT$(8)  ' Output: "10"`,

    REPEAT: `REPEAT$(string, count) - Repeat string
Returns string repeated count times
Example: PRINT REPEAT$("AB", 3)  ' Output: "ABABAB"`,

    REVERSE: `REVERSE$(string) - Reverse string
Returns reversed string
Example: PRINT REVERSE$("Hello")  ' Output: "olleH"`,

    // ── Custom functions ──

    MIN: `MIN(a1, a2, ...) - Minimum value
Returns the smallest of the given values (variadic)
Example: PRINT MIN(3, 7, 1)  ' Output: 1`,

    MAX: `MAX(a1, a2, ...) - Maximum value
Returns the largest of the given values (variadic)
Example: PRINT MAX(3, 7, 1)  ' Output: 7`,

    MOYAR: `MOYAR(a1, a2, ...) - Arithmetic mean
Returns the average of the given values (variadic)
Example: PRINT MOYAR(10, 20, 30)  ' Output: 20`,

    MOYPO: `MOYPO(a1, p1, a2, p2, ...) - Weighted average
Pairs of (value, weight). Returns weighted mean.
Example: PRINT MOYPO(10, 2, 20, 3)  ' Output: 16`,

    SUM: `SUM(a1, a2, ...) - Sum
Returns the sum of the given values (variadic)
Example: PRINT SUM(1, 2, 3, 4, 5)  ' Output: 15`,

    PROD: `PROD(a1, a2, ...) - Product
Returns the product of the given values (variadic)
Example: PRINT PROD(2, 3, 4)  ' Output: 24`,

    MEDIAN: `MEDIAN(a1, a2, ...) - Median
Returns the median of the given values (variadic)
Example: PRINT MEDIAN(3, 7, 5)  ' Output: 5`,

    STD: `STD(a1, a2, ...) - Standard deviation (sample)
Returns the sample standard deviation (requires 2+ values).
Uses n-1 denominator (Bessel's correction).
Example: PRINT STD(1, 3)  ' Output: 1.414`,

    ARRPROCH: `ARRPROCH(value, multiple [, roundUp]) - Round to multiple
Rounds value to nearest multiple. roundUp is optional:
  - Omitted or non-zero (TRUE): round UP (ceil)
  - 0 (FALSE): round DOWN (floor)
Example: PRINT ARRPROCH(17, 5)       ' Output: 20
Example: PRINT ARRPROCH(17, 5, 0)   ' Output: 15
Example: PRINT ARRPROCH(12.33, 0.25)  ' Output: 12.5`,

    PI: `PI - Constant PI (3.14159...)
Value of Pi.
Example: PRINT PI  ' Output: 3.14159265358979`,

    TIMER: `TIMER - Seconds since midnight
Returns the number of seconds since midnight
Example: PRINT TIMER`,

    'DATE$': `DATE$ - Current date
Returns the current date as "MM-DD-YYYY"
Example: PRINT DATE$`,

    'TIME$': `TIME$ - Current time
Returns the current time as "HH:MM:SS"
Example: PRINT TIME$`,
  },

  dateFunctions: {
    MKDATE: `MKDATE([year [, month [, day [, hours [, minutes [, seconds]]]]]]) - Create date timestamp
Returns a timestamp in seconds. All parameters are optional; omitted values default to the system date/time.
  MKDATE()          → system date/time
  MKDATE(2025)      → 2025 + system month/day/time
  MKDATE(2025, 4)   → 2025-04 + system day/time
  MKDATE(2025, 4, 15, 10, 30, 55) → full date
Example: D = MKDATE(2025, 12, 25, 8, 30, 0)`,

    YEAR: `YEAR(date) - Extract year from date
Returns the year from a date timestamp.
Example: PRINT YEAR(MKDATE(2025, 8, 25))  ' Output: 2025`,

    MONTH: `MONTH(date) - Extract month from date
Returns the month (1-12) from a date timestamp.
Example: PRINT MONTH(MKDATE(2025, 8, 25))  ' Output: 8`,

    DAY: `DAY(date) - Extract day from date
Returns the day of the month (1-31) from a date timestamp.
Example: PRINT DAY(MKDATE(2025, 8, 25))  ' Output: 25`,

    DAYW: `DAYW(date) - Day of week
Returns the day of week (0=Sunday, 1=Monday, ..., 6=Saturday).
Example: PRINT DAYW(MKDATE(2025, 8, 25))  ' Output: 0 (Sunday)`,

    HOUR: `HOUR(date) - Extract hour from date
Returns the hour (0-23) from a date timestamp.
Example: PRINT HOUR(MKDATE(2025, 8, 25, 14, 30, 45))  ' Output: 14`,

    MINUTE: `MINUTE(date) - Extract minute from date
Returns the minute (0-59) from a date timestamp.
Example: PRINT MINUTE(MKDATE(2025, 8, 25, 14, 30, 45))  ' Output: 30`,

    SECONDS: `SECONDS(date) - Extract seconds from date
Returns the seconds (0-59) from a date timestamp.
Example: PRINT SECONDS(MKDATE(2025, 8, 25, 14, 30, 45))  ' Output: 45`,

    'DATESTR$': `DATESTR$(date) - Date to ISO string
Converts a date timestamp to an ISO string "YYYY-MM-DD HH:mm:ss".
Example: PRINT DATESTR$(MKDATE(2025, 8, 5, 9, 4, 7))  ' Output: 2025-08-05 09:04:07`,

    TODATE: `TODATE(string) - ISO string to date
Converts an ISO string "YYYY-MM-DD HH:mm:ss" to a date timestamp.
Example: D = TODATE("2025-12-25 08:30:15")`,

    dateArithmetic: `Date Arithmetic:
  date - date     → difference in seconds
  date + number   → date + N seconds
  date - number   → date - N seconds
Examples:
  D1 = MKDATE(2025, 1, 1)
  D2 = MKDATE(2025, 1, 2)
  PRINT D2 - D1     ' Output: 86400 (one day in seconds)
  D3 = D1 + 3600    ' Add one hour`,
  },

  operators: {
    arithmetic: `
Arithmetic Operators:
  +  Addition / String concatenation
  -  Subtraction
  *  Multiplication
  /  Division
  ^  Power (exponentiation)
  MOD  Modulo (remainder)
`,

    comparison: `
Comparison Operators:
  =  Equal
  <>  Not equal
  <  Less than
  >  Greater than
  <=  Less than or equal
  >=  Greater than or equal
`,

    logical: `
Logical Operators:
  AND  Logical AND
  OR   Logical OR
  NOT  Logical NOT
  XOR  Exclusive OR
`,
  },

  tips: `
TIPS AND TRICKS:

1. Variable Types:
   - Numeric: X, Y, Z (default)
   - String: N$, S$, T$ (ends with $)
   - Integer: I%, J%, K% (ends with %)

2. String Concatenation:
   - Use semicolon (;) in PRINT
   - Example: PRINT "Hello" + " " + "World"

3. Arrays:
   - Declare with DIM
   - Use parentheses: A(1), B(2,3)

4. Loops:
   - FOR loops for fixed iterations
   - WHILE loops for conditional iterations
   - DO...LOOP for post-condition loops

5. Subroutines:
   - Use GOSUB to call
   - Use RETURN to exit

6. Comments:
   - Use REM or ' at start of line
   - Helps document your code

7. Line Numbers:
   - Use 10, 20, 30... for easy editing
   - Can jump to any line number

8. Screen Positioning:
   - Use LOCATE row, col to position cursor
   - Use COLOR fg, bg to set text colors

9. INPUT Tips:
   - INPUT "Name: "; N$  (no ? after prompt)
   - INPUT "Name", N$    (? after prompt)

10. User Functions:
    - DEF FN DOUBLE(X) = X * 2
    - PRINT FN DOUBLE(5)  ' Output: 10

11. Development Tools:
    - Click TOOLS for Linter, Renumber, and Auto-fix
    - Linter shows errors in real-time as you type
    - Renumber reorganizes line numbers (10, 20, 30...)
    - Auto-fix corrects keyword casing and indentation

12. Trigonometry:
    - Use DEGTORAD() to convert degrees to radians
    - Use RADTODEG() to convert radians to degrees
    - ATAN2(y, x) returns angle from -PI to +PI
    - PI constant available for calculations
`,
};

export default HELP;