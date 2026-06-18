/**
 * GWBASIC Interpreter - Main Page
 * 
 * Design: Rétro Terminal Authentique
 * - Split layout: Editor (left) and Terminal (right)
 * - Green phosphor aesthetic
 * - Authentic GWBASIC experience
 * - Step-by-step execution with variable inspector
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Lexer, Parser, GWBASICInterpreter, TerminalCell, StepInfo } from '@/lib/gwbasic-interpreter';
import { EXAMPLES } from '@/lib/examples';
import { renumber, sortAndRenumber } from '@/lib/renumber';
import { lint, type LintResult, type LintWarning } from '@/lib/linter';
import { autoFix } from '@/lib/autofix';
import Editor, { type HighlightRange } from '@/components/Editor';
import Terminal from '@/components/Terminal';
import HelpPanel from '@/components/HelpPanel';

const STORAGE_KEY = 'gwbasic-code';

interface InputRequest {
  prompt: string;
  resolve: (value: string) => void;
}

interface VariableInfo {
  name: string;
  value: string;
  type: string;
}

/** Floating variable inspector panel with drag support */
function VariableInspector({ variables, onClose }: { variables: VariableInfo[]; onClose: () => void }) {
  const [position, setPosition] = useState({ x: 16, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [posBottom, setPosBottom] = useState(68);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - (window.innerHeight - posBottom),
    });
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 380, e.clientX - dragOffset.x));
      const newBottom = Math.max(0, Math.min(window.innerHeight - 100, window.innerHeight - (e.clientY - dragOffset.y)));
      setPosition({ x: newX, y: 0 });
      setPosBottom(newBottom);
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: `${posBottom}px`,
        left: `${position.x}px`,
        width: '360px',
        maxHeight: '400px',
        backgroundColor: '#0A0A0A',
        border: '2px solid #00FF00',
        borderRadius: '4px',
        zIndex: 100,
        overflow: 'hidden',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #006600',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#00FF00', fontWeight: 'bold', fontSize: '11px' }}>
          &#9632; VARIABLES ({variables.length})
        </span>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'transparent',
            color: '#00FF00',
            border: '1px solid #006600',
            padding: '2px 8px',
            cursor: 'pointer',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '11px',
          }}
        >
          &#10005;
        </button>
      </div>
      <div style={{ overflow: 'auto', flex: 1, padding: '4px 0' }}>
        {variables.length === 0 ? (
          <div style={{ padding: '12px', color: '#006600', textAlign: 'center' }}>No variables defined</div>
        ) : (
          variables.map((v, i) => (
            <div
              key={i}
              style={{
                padding: '4px 12px',
                borderBottom: i < variables.length - 1 ? '1px solid #001A00' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: '#FFAA00', fontWeight: 'bold' }}>{v.name}</span>
              <span style={{ color: v.type === 'string' ? '#FFAA00' : '#00FF00' }}>
                {v.type === 'string' ? `"${v.value}"` : v.value}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [code, setCode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || `10 print "Welcome to GWBASIC Interpreter!"
20 print "Type your program and click RUN"
30 print ""
40 print "Example:"
50 for i = 1 to 10
60   print i
70 next i
80 print ""
90 print "Try LINT (F7) then AUTO-FIX!"`;
    } catch {
      return `10 print "Welcome to GWBASIC Interpreter!"
20 print "Type your program and click RUN"
30 print ""
40 print "Example:"
50 for i = 1 to 10
60   print i
70 next i
80 print ""
90 print "Try LINT (F7) then AUTO-FIX!"`;
    }
  });
  
  const [buffer, setBuffer] = useState<TerminalCell[][] | undefined>(undefined);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'ready' | 'running' | 'stopped'>('ready');
  const [currentInputPrompt, setCurrentInputPrompt] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [inputColor, setInputColor] = useState('#AAAAAA');
  const inputQueueRef = useRef<InputRequest[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [lintResult, setLintResult] = useState<LintResult | null>(null);
  const [showLintPanel, setShowLintPanel] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [liveLintSummary, setLiveLintSummary] = useState<{ errors: number; warnings: number; infos: number }>({ errors: 0, warnings: 0, infos: 0 });
  const [lintLines, setLintLines] = useState<Map<number, LintWarning>>(new Map());
  const interpreterRef = useRef<GWBASICInterpreter | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const lintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Step mode state
  const [stepMode, setStepMode] = useState(false);
  const [variables, setVariables] = useState<VariableInfo[]>([]);
  const [showVariables, setShowVariables] = useState(false);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [highlightRange, setHighlightRange] = useState<HighlightRange | null>(null);
  const [paused, setPaused] = useState(false);
  const stepResolveRef = useRef<(() => void) | null>(null);

  // Close tools menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persist code to localStorage
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    try {
      localStorage.setItem(STORAGE_KEY, newCode);
    } catch { }
  }, []);

  // Debounced live linting
  useEffect(() => {
    if (lintTimerRef.current) clearTimeout(lintTimerRef.current);
    lintTimerRef.current = setTimeout(() => {
      const result = lint(code);
      setLiveLintSummary({
        errors: result.warnings.filter(w => w.type === 'error').length,
        warnings: result.warnings.filter(w => w.type === 'warning').length,
        infos: result.warnings.filter(w => w.type === 'info').length,
      });
      const lineMap = new Map<number, LintWarning>();
      for (const w of result.warnings) {
        if (w.type === 'error' || w.type === 'warning') {
          if (!lineMap.has(w.line)) lineMap.set(w.line, w);
        }
      }
      setLintLines(lineMap);
    }, 800);
    return () => { if (lintTimerRef.current) clearTimeout(lintTimerRef.current); };
  }, [code]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') { e.preventDefault(); if (!isRunning) handleRun(); }
      if (e.key === 'F1') { e.preventDefault(); setHelpOpen(prev => !prev); }
      if (e.key === 'F6') { e.preventDefault(); if (!isRunning) handleRenumber(); }
      if (e.key === 'F7') { e.preventDefault(); handleLint(); }
      if (e.key === 'F9') { e.preventDefault(); if (!isRunning) handleStepMode(); }
      if (e.key === 'F10') { e.preventDefault(); if (paused) handleSingleStep(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, paused]);

  /** Find the editor line number (1-based) from a BASIC line number */
  const findEditorLine = (basicLineNum: number): number => {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^\s*(\d+)/);
      if (match && parseInt(match[1]) === basicLineNum) return i + 1;
    }
    return -1;
  };

  /** Calculate the precise character range of a statement within its source line */
  const calcStatementRange = (stepInfo: StepInfo): HighlightRange | null => {
    const lineNum = stepInfo.lineNumber;
    if (lineNum === undefined) return null;

    const editorLine = findEditorLine(lineNum);
    if (editorLine < 0) return null;

    const lines = code.split('\n');
    const sourceLine = lines[editorLine - 1];
    if (!sourceLine) return null;

    const lineNumMatch = sourceLine.match(/^\s*\d+\s*/);
    const lineNumEnd = lineNumMatch ? lineNumMatch[0].length : 0;
    const stmtType = stepInfo.statementType;

    // Map statement type -> BASIC keywords
    const typeToKw: Record<string, string[]> = {
      PrintStatement: ['PRINT'],
      IfStatement: ['IF'],
      ForStatement: ['FOR'],
      WhileStatement: ['WHILE'],
      GosubStatement: ['GOSUB'],
      ReturnStatement: ['RETURN'],
      GotoStatement: ['GOTO'],
      EndStatement: ['END'],
      DimStatement: ['DIM'],
      DataStatement: ['DATA'],
      ReadStatement: ['READ'],
      RestoreStatement: ['RESTORE'],
      RandomizeStatement: ['RANDOMIZE'],
      ClsStatement: ['CLS'],
      SwapStatement: ['SWAP'],
      DoLoopStatement: ['DO'],
      WriteStatement: ['WRITE'],
      LocateStatement: ['LOCATE'],
      ColorStatement: ['COLOR'],
      EraseStatement: ['ERASE'],
      DefFnStatement: ['DEF'],
      SelectCaseStatement: ['SELECT'],
      RemStatement: ['REM'],
      MidAssignStatement: ['MID$'],
      NextStatement: ['NEXT'],
      WendStatement: ['WEND'],
    };

    const keywords = typeToKw[stmtType];

    if (!keywords) {
      // LetStatement or variable assignment: find `identifier =`
      const rest = sourceLine.substring(lineNumEnd);
      const m = rest.match(/([A-Za-z_][A-Za-z0-9_$%!]*)\s*=/);
      if (m) return { line: editorLine, startCol: lineNumEnd + m.index!, endCol: sourceLine.length };
      return { line: editorLine, startCol: lineNumEnd, endCol: sourceLine.length };
    }

    // Search for keyword (case-insensitive)
    const lineUpper = sourceLine.substring(lineNumEnd).toUpperCase();
    for (const kw of keywords) {
      const idx = lineUpper.indexOf(kw);
      if (idx >= 0) {
        const startCol = lineNumEnd + idx;
        // Find next colon (skip inside strings) or end of line
        let endCol = sourceLine.length;
        let inStr = false;
        for (let c = startCol; c < sourceLine.length; c++) {
          if (sourceLine[c] === '"') inStr = !inStr;
          if (!inStr && sourceLine[c] === ':') { endCol = c; break; }
        }
        return { line: editorLine, startCol, endCol };
      }
    }

    return { line: editorLine, startCol: lineNumEnd, endCol: sourceLine.length };
  };

  const handleSingleStep = () => {
    if (stepResolveRef.current) {
      stepResolveRef.current();
      stepResolveRef.current = null;
    }
  };

  const handleStepMode = async () => {
    if (isRunning || paused) {
      if (stepResolveRef.current) { stepResolveRef.current(); stepResolveRef.current = null; }
      return;
    }

    setStepMode(true);
    setShowVariables(true);
    setPaused(false);
    setIsRunning(true);
    setStatus('running');
    inputQueueRef.current = [];
    setCurrentInputPrompt(null);
    setHighlightRange(null);
    setHighlightLine(1);

    try {
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const interpreter = new GWBASICInterpreter();
      interpreterRef.current = interpreter;
      interpreter.enableStepMode(true);
      interpreter.setOnOutputCallback((buf, cx, cy, fgHex) => {
        setBuffer(buf.map(row => row.map(c => ({ ...c }))));
        setCursorPos({ x: cx, y: cy });
        if (fgHex) setInputColor(fgHex);
      });
      interpreter.setInputCallback(async (prompt: string) => {
        return new Promise(resolve => {
          const isFirst = inputQueueRef.current.length === 0;
          inputQueueRef.current = [...inputQueueRef.current, { prompt, resolve }];
          if (isFirst) setCurrentInputPrompt(prompt);
        });
      });
      interpreter.setStepCallback((info: StepInfo, resume: () => void) => {
        setVariables(info.variables);
        const range = calcStatementRange(info);
        setHighlightRange(range);
        if (range) setHighlightLine(range.line);
        setPaused(true);
        stepResolveRef.current = () => {
          setPaused(false);
          setHighlightRange(null);
          setHighlightLine(null);
          resume();
        };
      });
      await interpreter.execute(ast);
      setBuffer(interpreter.getBuffer().map(row => row.map(c => ({ ...c }))));
      setHighlightRange(null);
      setHighlightLine(null);
      setPaused(false);
    } catch (error) {
      const errMsg = String(error);
      let lineInfo = '';
      if (interpreterRef.current) {
        const line = interpreterRef.current.getCurrentLine();
        if (line >= 0) lineInfo = ` at line ${line}`;
      }
      const errBuf = interpreterRef.current?.getBuffer();
      if (errBuf) {
        const newBuf = errBuf.map(row => row.map(c => ({ ...c })));
        for (let y = 0; y < newBuf.length; y++) {
          const text = newBuf[y].map(c => c.char).join('').trim();
          if (text === '') {
            const msg = `ERROR${lineInfo}: ${errMsg}`;
            for (let x = 0; x < msg.length && x < 80; x++) newBuf[y][x] = { char: msg[x], fg: '#FF5555', bg: '#000000' };
            break;
          }
        }
        setBuffer(newBuf);
      }
    } finally {
      setIsRunning(false);
      setStatus('stopped');
      setStepMode(false);
      setPaused(false);
      setHighlightRange(null);
      setHighlightLine(null);
    }
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStatus('running');
    inputQueueRef.current = [];
    setCurrentInputPrompt(null);
    setHighlightLine(null);
    setHighlightRange(null);
    try {
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const interpreter = new GWBASICInterpreter();
      interpreterRef.current = interpreter;
      interpreter.setOnOutputCallback((buf, cx, cy, fgHex) => {
        setBuffer(buf.map(row => row.map(c => ({ ...c }))));
        setCursorPos({ x: cx, y: cy });
        if (fgHex) setInputColor(fgHex);
      });
      interpreter.setInputCallback(async (prompt: string) => {
        return new Promise(resolve => {
          const isFirst = inputQueueRef.current.length === 0;
          inputQueueRef.current = [...inputQueueRef.current, { prompt, resolve }];
          if (isFirst) setCurrentInputPrompt(prompt);
        });
      });
      await interpreter.execute(ast);
      setBuffer(interpreter.getBuffer().map(row => row.map(c => ({ ...c }))));
    } catch (error) {
      const errMsg = String(error);
      let lineInfo = '';
      if (interpreterRef.current) {
        const line = interpreterRef.current.getCurrentLine();
        if (line >= 0) lineInfo = ` at line ${line}`;
      }
      const errBuf = interpreterRef.current?.getBuffer();
      if (errBuf) {
        const newBuf = errBuf.map(row => row.map(c => ({ ...c })));
        for (let y = 0; y < newBuf.length; y++) {
          const text = newBuf[y].map(c => c.char).join('').trim();
          if (text === '') {
            const msg = `ERROR${lineInfo}: ${errMsg}`;
            for (let x = 0; x < msg.length && x < 80; x++) newBuf[y][x] = { char: msg[x], fg: '#FF5555', bg: '#000000' };
            break;
          }
        }
        setBuffer(newBuf);
      }
    } finally {
      setIsRunning(false);
      setStatus('stopped');
    }
  };

  const handleStop = () => {
    if (interpreterRef.current) interpreterRef.current.abort();
    setIsRunning(false);
    setStatus('stopped');
    setPaused(false);
    setHighlightRange(null);
    setHighlightLine(null);
    if (stepResolveRef.current) { stepResolveRef.current(); stepResolveRef.current = null; }
  };

  const handleClear = () => {
    setBuffer(undefined);
    setStatus('ready');
    setCode('');
    setLiveLintSummary({ errors: 0, warnings: 0, infos: 0 });
    setLintLines(new Map());
    setVariables([]);
    setShowVariables(false);
    setHighlightLine(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { }
  };

  const handleLoadExample = (example: string) => handleCodeChange(example);
  const handleExport = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'program.bas';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  const handleImport = () => fileInputRef.current?.click();
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const content = ev.target?.result as string; if (content) handleCodeChange(content); };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRenumber = useCallback(() => {
    const result = renumber(code, 10, 10);
    if (result.success) { handleCodeChange(result.code); setStatus('ready'); }
  }, [code, handleCodeChange]);

  const handleSortAndRenumber = useCallback(() => {
    const result = sortAndRenumber(code, 10, 10);
    if (result.success) { handleCodeChange(result.code); setStatus('ready'); }
  }, [code, handleCodeChange]);

  const handleLint = useCallback(() => {
    const result = lint(code);
    setLintResult(result);
    setShowLintPanel(true);
  }, [code]);

  const handleAutoFix = useCallback(() => {
    const result = autoFix(code);
    if (result.fixes > 0) { handleCodeChange(result.code); setLintResult(lint(result.code)); }
  }, [code, handleCodeChange]);

  const handleScrollToLine = useCallback((line: number) => {
    const highlightEl = document.getElementById('editor-highlight');
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const lineHeight = 21;
      const targetScroll = Math.max(0, (line - 1) * lineHeight - 100);
      textarea.scrollTop = targetScroll;
      if (highlightEl) highlightEl.scrollTop = targetScroll;
      textarea.focus();
    }
  }, []);

  const handleInput = useCallback((input: string) => {
    const queue = inputQueueRef.current;
    if (queue.length > 0) {
      const first = queue[0];
      const rest = queue.slice(1);
      inputQueueRef.current = rest;
      first.resolve(input);
      setCurrentInputPrompt(rest.length > 0 ? rest[0].prompt : null);
    }
  }, []);

  const lintBadge = (() => {
    const { errors, warnings } = liveLintSummary;
    if (errors === 0 && warnings === 0) return null;
    const parts: string[] = [];
    if (errors > 0) parts.push(`ERR:${errors}`);
    if (warnings > 0) parts.push(`WARN:${warnings}`);
    return parts.join(' ');
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#000000', color: '#00FF00', fontFamily: '"IBM Plex Mono", monospace' }}>
      <header style={{ backgroundColor: '#0A0A0A', borderBottom: '2px solid #00FF00', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
            ▓▓ GWBASIC Interpreter v1.0 ▓▓
            {status === 'running' && !paused && <span style={{ color: '#00FF00', fontSize: '12px', border: '1px solid #00FF00', padding: '2px 6px' }}>RUNNING</span>}
            {status === 'running' && paused && <span style={{ color: '#FFFF00', fontSize: '12px', border: '1px solid #FFFF00', padding: '2px 6px' }}>PAUSED</span>}
            {status === 'stopped' && <span style={{ color: '#FFAA00', fontSize: '12px', border: '1px solid #FFAA00', padding: '2px 6px' }}>STOPPED</span>}
            {status === 'ready' && <span style={{ color: '#006600', fontSize: '12px', border: '1px solid #006600', padding: '2px 6px' }}>READY</span>}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#006600' }}>
            Authentic BASIC Language Emulator &#8212; F5: Run | F9: Step Mode | F10: Step | F6: Renumber | F7: Lint | F1: Help
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleRun} disabled={isRunning} style={{ backgroundColor: '#00FF00', color: '#000000', border: 'none', padding: '8px 16px', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 'bold', cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning ? 0.5 : 1 }}>&#9654; RUN</button>
          {!isRunning && <button onClick={handleStepMode} style={{ backgroundColor: '#FFFF00', color: '#000000', border: 'none', padding: '8px 16px', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 'bold', cursor: 'pointer' }}>&#9193; STEP</button>}
          {paused && <button onClick={handleSingleStep} style={{ backgroundColor: '#FFAA00', color: '#000000', border: 'none', padding: '8px 16px', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 'bold', cursor: 'pointer', animation: 'pulse 1s infinite' }}>&#9197; STEP (F10)</button>}
          {isRunning && <button onClick={handleStop} style={{ backgroundColor: '#FF0000', color: '#000000', border: 'none', padding: '8px 16px', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 'bold', cursor: 'pointer', animation: 'pulse 1s infinite' }}>&#9632; STOP</button>}
          <button onClick={handleClear} disabled={isRunning} style={{ backgroundColor: '#FFAA00', color: '#000000', border: 'none', padding: '8px 16px', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 'bold', cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning ? 0.5 : 1 }}>&#10005; CLEAR</button>
          <div ref={toolsMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setToolsMenuOpen(prev => !prev)} disabled={isRunning} style={{ backgroundColor: '#0A0A0A', color: '#00FF00', border: '1px solid #00FF00', padding: '8px 12px', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 'bold', cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning ? 0.5 : 1 }}>&#9776; TOOLS &#9662;</button>
            {toolsMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', backgroundColor: '#0A0A0A', border: '1px solid #00FF00', boxShadow: '0 4px 12px rgba(0,0,0,0.6)', zIndex: 1000, minWidth: '200px', display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => { handleLint(); setToolsMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', backgroundColor: '#1A1A00', color: '#FFAA00', border: 'none', borderBottom: '1px solid #002200', padding: '10px 14px', fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px', cursor: 'pointer' }}>&#9650; LINT (F7)</button>
                <button onClick={() => { handleAutoFix(); setToolsMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', backgroundColor: '#1A1A00', color: '#FFAA00', border: 'none', borderBottom: '1px solid #002200', padding: '10px 14px', fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px', cursor: 'pointer' }}>&#10024; AUTO-FIX</button>
                <button onClick={() => { handleRenumber(); setToolsMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', backgroundColor: '#001A00', color: '#00FF00', border: 'none', borderBottom: '1px solid #002200', padding: '10px 14px', fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px', cursor: 'pointer' }}># RENUMBER (F6)</button>
                <div style={{ height: '1px', backgroundColor: '#006600' }} />
                <button onClick={() => { handleExport(); setToolsMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', backgroundColor: '#001A00', color: '#00FF00', border: 'none', borderBottom: '1px solid #002200', padding: '10px 14px', fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px', cursor: 'pointer' }}>&#128190; EXPORT</button>
                <button onClick={() => { handleImport(); setToolsMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', backgroundColor: '#001A00', color: '#00FF00', border: 'none', borderBottom: '1px solid #002200', padding: '10px 14px', fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px', cursor: 'pointer' }}>&#128194; IMPORT</button>
                <div style={{ height: '1px', backgroundColor: '#006600' }} />
                <button onClick={() => { setShowVariables(!showVariables); setToolsMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', backgroundColor: '#001A00', color: '#00FF00', border: 'none', borderBottom: '1px solid #002200', padding: '10px 14px', fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px', cursor: 'pointer' }}>{showVariables ? '&#128269; HIDE VARIABLES' : '&#128269; SHOW VARIABLES'}</button>
                <div style={{ height: '1px', backgroundColor: '#006600' }} />
                <button onClick={() => { setHelpOpen(true); setToolsMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', backgroundColor: '#001A00', color: '#00FF00', border: 'none', padding: '10px 14px', fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px', cursor: 'pointer' }}>? HELP (F1)</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="main-content" style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '8px', padding: '8px' }}>
        <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#0A0A0A', padding: '8px 12px', borderBottom: '1px solid #00FF00', fontSize: '12px', color: '#006600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>EDITOR</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {stepMode && paused && <span style={{ color: '#FFFF00', fontWeight: 'bold', fontSize: '10px', border: '1px solid #FFFF00', padding: '1px 6px' }}>STEP: {highlightLine ? `Line ${highlightLine}` : ''}</span>}
              {lintBadge && <span style={{ color: liveLintSummary.errors > 0 ? '#FF5555' : '#FFAA00', fontWeight: 'bold', fontSize: '10px', border: liveLintSummary.errors > 0 ? '1px solid #FF5555' : '1px solid #FFAA00', padding: '1px 6px' }} title="Live lint issues">&#9888; {lintBadge}</span>}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor code={code} onChange={handleCodeChange} highlightRange={highlightRange} />
          </div>
        </div>
        <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#0A0A0A', padding: '8px 12px', borderBottom: '1px solid #00FF00', fontSize: '12px', color: '#006600' }}>OUTPUT</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Terminal buffer={buffer} onInput={handleInput} inputPrompt={currentInputPrompt} cursorX={cursorPos.x} cursorY={cursorPos.y} inputColor={inputColor} />
          </div>
        </div>
      </div>

      {showVariables && variables.length > 0 && <VariableInspector variables={variables} onClose={() => setShowVariables(false)} />}

      <footer style={{ backgroundColor: '#0A0A0A', borderTop: '2px solid #00FF00', padding: '8px 16px', fontSize: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', color: '#006600', overflowY: 'auto', maxHeight: '60px' }}>
        <span>Examples:</span>
        {Object.entries(EXAMPLES).map(([key, example]) => (
          <button key={key} onClick={() => handleLoadExample(example)} style={{ backgroundColor: 'transparent', color: '#00FF00', border: '1px solid #00FF00', padding: '2px 8px', fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.backgroundColor = '#00FF00'; (e.target as HTMLButtonElement).style.color = '#000000'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.target as HTMLButtonElement).style.color = '#00FF00'; }}
          >{key.replace(/([A-Z])/g, ' $1').trim()}</button>
        ))}
      </footer>

      {showLintPanel && lintResult && (
        <div style={{ position: 'fixed', bottom: '68px', right: '16px', width: '480px', maxHeight: '320px', backgroundColor: '#0A0A0A', border: `2px solid ${lintResult.success ? '#00FF00' : '#FFAA00'}`, borderRadius: '4px', padding: '12px', zIndex: 100, overflow: 'auto', fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #006600', paddingBottom: '6px' }}>
            <span style={{ color: lintResult.success ? '#00FF00' : '#FFAA00', fontWeight: 'bold' }}>{lintResult.success ? '&#10003; LINT PASSED' : '&#10007; LINT ISSUES'}</span>
            <span style={{ color: '#006600' }}>{lintResult.summary}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {lintResult.warnings.length > 0 && <button onClick={handleAutoFix} style={{ backgroundColor: '#003300', color: '#00FF00', border: '1px solid #00FF00', padding: '2px 8px', cursor: 'pointer', fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px' }}>&#10024; AUTO-FIX</button>}
              <button onClick={() => setShowLintPanel(false)} style={{ backgroundColor: 'transparent', color: '#00FF00', border: '1px solid #006600', padding: '2px 8px', cursor: 'pointer', fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px' }}>&#10005; CLOSE</button>
            </div>
          </div>
          {lintResult.warnings.length === 0 ? (
            <div style={{ color: '#006600', padding: '8px 0' }}>No issues found.</div>
          ) : (
            lintResult.warnings.map((w, idx) => (
              <div key={idx} onClick={() => handleScrollToLine(w.line)} style={{ padding: '4px 6px', margin: '2px 0', backgroundColor: w.type === 'error' ? '#1A0000' : w.type === 'warning' ? '#1A1A00' : '#001A00', borderLeft: `3px solid ${w.type === 'error' ? '#FF5555' : w.type === 'warning' ? '#FFAA00' : '#00FF00'}`, color: w.type === 'error' ? '#FF5555' : w.type === 'warning' ? '#FFAA00' : '#00AA00', fontSize: '11px', cursor: 'pointer' }}>
                <span style={{ fontWeight: 'bold' }}>{w.code ? `[${w.code}] ` : ''}Line {w.line}:</span> {w.message}
              </div>
            ))
          )}
        </div>
      )}

      <HelpPanel isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <input ref={fileInputRef} type="file" accept=".bas,.txt,.b" onChange={handleImportFile} style={{ display: 'none' }} />

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #000000; }
        button:hover:not(:disabled) { filter: brightness(1.2); }
        button:active:not(:disabled) { transform: scale(0.98); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
        @media (max-width:768px) {
          .main-content { flex-direction: column !important; }
          .main-content > div { flex: 1 1 50% !important; min-height: 40vh !important; }
          header { flex-direction: column !important; gap: 8px !important; }
        }
      `}</style>
    </div>
  );
}