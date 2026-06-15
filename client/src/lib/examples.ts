/**
 * GWBASIC Example Programs
 * Collection of sample programs for demonstration
 */

export const EXAMPLES = {
  forLoop: `10 PRINT "FOR Loop Example"
20 PRINT ""
30 FOR I = 1 TO 10
40 PRINT "Number:"; I
50 NEXT I
60 PRINT ""
70 PRINT "Done!"`,

  mathOperations: `10 PRINT "Math Operations"
20 PRINT ""
30 X = 15
40 Y = 4
50 PRINT "X = "; X
60 PRINT "Y = "; Y
70 PRINT ""
80 PRINT "X + Y = "; X + Y
90 PRINT "X - Y = "; X - Y
100 PRINT "X * Y = "; X * Y
110 PRINT "X / Y = "; X / Y
120 PRINT "X ^ Y = "; X ^ Y
130 PRINT "X MOD Y = "; X MOD Y`,

  ifStatement: `10 PRINT "IF/ELSE Example"
20 PRINT ""
30 FOR I = 1 TO 5
40 IF I MOD 2 = 0 THEN PRINT I; " is even"
50 IF I MOD 2 = 1 THEN PRINT I; " is odd"
60 NEXT I`,

  whileLoop: `10 PRINT "WHILE Loop Example"
20 PRINT ""
30 I = 1
40 WHILE I <= 5
50 PRINT "I = "; I
60 I = I + 1
70 WEND
80 PRINT "Done!"`,

  stringFunctions: `10 PRINT "String Functions"
20 PRINT ""
30 S = "HELLO WORLD"
40 PRINT "Original: "; S
50 PRINT "Length: "; LEN(S)
60 PRINT "Left 5: "; LEFT$(S, 5)
70 PRINT "Right 5: "; RIGHT$(S, 5)
80 PRINT "Mid 7-11: "; MID$(S, 7, 5)
90 PRINT "Position of WORLD: "; INSTR(S, "WORLD")`,

  arrayExample: `10 PRINT "Array Example"
20 PRINT ""
30 DIM A(5)
40 FOR I = 1 TO 5
50 A(I) = I * 10
60 NEXT I
70 PRINT "Array contents:"
80 FOR I = 1 TO 5
90 PRINT "A("; I; ") = "; A(I)
100 NEXT I`,

  dataRead: `10 PRINT "DATA and READ"
20 PRINT ""
30 READ A, B, C
40 PRINT "Values: "; A; ", "; B; ", "; C
50 PRINT "Sum: "; A + B + C
60 DATA 10, 20, 30`,

  fibonacci: `10 PRINT "Fibonacci Sequence"
20 PRINT ""
30 A = 0
40 B = 1
50 FOR I = 1 TO 10
60 PRINT A
70 C = A + B
80 A = B
90 B = C
100 NEXT I`,

  factorial: `10 PRINT "Factorial Calculator"
20 PRINT ""
30 N = 5
40 F = 1
50 FOR I = 1 TO N
60 F = F * I
70 NEXT I
80 PRINT N; "! = "; F`,

  nestedLoops: `10 PRINT "Nested Loops"
20 PRINT ""
30 FOR I = 1 TO 3
40 FOR J = 1 TO 3
50 PRINT I; ","; J; " ";
60 NEXT J
70 PRINT ""
80 NEXT I`,

  trigonometry: `10 PRINT "Trigonometry"
20 PRINT ""
30 PI = 3.14159
40 ANGLE = PI / 4
50 PRINT "Angle: "; ANGLE
60 PRINT "SIN: "; SIN(ANGLE)
70 PRINT "COS: "; COS(ANGLE)
80 PRINT "TAN: "; TAN(ANGLE)`,

  randomNumbers: `10 PRINT "Random Numbers"
20 PRINT ""
30 RANDOMIZE
40 FOR I = 1 TO 5
50 R = INT(RND * 100)
60 PRINT "Random: "; R
70 NEXT I`,

  bubbleSort: `10 PRINT "Bubble Sort Demo"
20 DIM A(9)
30 FOR I = 1 TO 9: A(I) = INT(RND * 100): NEXT I
40 PRINT "Before:"
50 FOR I = 1 TO 9: PRINT A(I);: NEXT I
60 PRINT ""
70 FOR I = 1 TO 8
80 FOR J = 1 TO 9 - I
90 IF A(J) > A(J + 1) THEN T = A(J): A(J) = A(J + 1): A(J + 1) = T
100 NEXT J
110 NEXT I
120 PRINT "After:"
130 FOR I = 1 TO 9: PRINT A(I);: NEXT I
140 PRINT ""`,

  guessTheNumber: `10 PRINT "Guess the Number!"
20 PRINT "I'm thinking of a number between 1 and 100"
30 RANDOMIZE
40 N = INT(RND * 100) + 1
50 T = 0
60 INPUT "Your guess"; G
70 T = T + 1
80 IF G = N THEN PRINT "Correct in"; T; "tries!": END
90 IF G > N THEN PRINT "Too high!" ELSE PRINT "Too low!"
100 GOTO 60`,
};

export default EXAMPLES;