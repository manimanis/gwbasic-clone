/**
 * GWBASIC Interpreter - Main Page
 * 
 * Design: Rétro Terminal Authentique
 * - Split layout: Editor (left) and Terminal (right)
 * - Green phosphor aesthetic
 * - Authentic GWBASIC experience
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Lexer, Parser, GWBASICInterpreter, TerminalCell } from '@/lib/gwbasic-interpreter';
import { EXAMPLES } from '@/lib/examples';
import { renumber, sortAndRenumber } from '@/lib/renumber';
import { lint, type LintResult, type LintWarning } from '@/lib/linter';
import { autoFix } from '@/lib/autofix';
import Editor from '@/components/Editor';
import Terminal from '@/components/Terminal';
import HelpPanel from '@/components/HelpPanel';

const STORAGE_KEY = 'gwbasic-code';

interface InputRequest {
  prompt: string;
  resolve: (value: string) => void;
}

/** Small helper for tools dropdown items */
function ToolsMenuItem({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        backgroundColor: hover ? '#003300' : (accent ? '#1A1A00' : '#001A00'),
        color: hover ? '#00FF00' : (accent ? '#FFAA00' : '#00FF00'),
        border: 'none',
        borderBottom: '1px solid #002200',
        padding: '10px 14px',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.1s',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {label}
    </button>
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
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  // Debounced live linting (800ms after last keystroke)
  useEffect(() => {
    if (lintTimerRef.current) {
      clearTimeout(lintTimerRef.current);
    }
    lintTimerRef.current = setTimeout(() => {
      const result = lint(code);
      setLiveLintSummary({
        errors: result.warnings.filter(w => w.type === 'error').length,
        warnings: result.warnings.filter(w => w.type === 'warning').length,
        infos: result.warnings.filter(w => w.type === 'info').length,
      });
      // Build a map of line -> first warning per line (for editor highlighting)
      const lineMap = new Map<number, LintWarning>();
      for (const w of result.warnings) {
        if (w.type === 'error' || w.type === 'warning') {
          if (!lineMap.has(w.line)) {
            lineMap.set(w.line, w);
          }
        }
      }
      setLintLines(lineMap);
    }, 800);
    return () => {
      if (lintTimerRef.current) clearTimeout(lintTimerRef.current);
    };
  }, [code]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        if (!isRunning) handleRun();
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setHelpOpen(prev => !prev);
      }
      if (e.key === 'F6') {
        e.preventDefault();
        if (!isRunning) handleRenumber();
      }
      if (e.key === 'F7') {
        e.preventDefault();
        handleLint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning]);

  const handleRun = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setStatus('running');
    inputQueueRef.current = [];
    setCurrentInputPrompt(null);

    try {
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const interpreter = new GWBASICInterpreter();
      interpreterRef.current = interpreter;

      // Real-time buffer callback
      interpreter.setOnOutputCallback((buf: TerminalCell[][], cx: number, cy: number, fgHex: string) => {
        setBuffer(buf.map(row => row.map(c => ({ ...c }))));
        setCursorPos({ x: cx, y: cy });
        if (fgHex) setInputColor(fgHex);
      });

      interpreter.setInputCallback(async (prompt: string) => {
        return new Promise((resolve) => {
          const isFirst = inputQueueRef.current.length === 0;
          inputQueueRef.current = [...inputQueueRef.current, { prompt, resolve }];
          if (isFirst) {
            setCurrentInputPrompt(prompt);
          }
        });
      });

      await interpreter.execute(ast);

      // Final buffer state
      setBuffer(interpreter.getBuffer().map(row => row.map(c => ({ ...c }))));
    } catch (error) {
      const errorMsg = String(error);
      let lineInfo = '';
      if (interpreterRef.current) {
        const line = interpreterRef.current.getCurrentLine();
        if (line >= 0) lineInfo = ` at line ${line}`;
      }
      // Show error in buffer
      const errBuf = interpreterRef.current?.getBuffer();
      if (errBuf) {
        const newBuf = errBuf.map(row => row.map(c => ({ ...c })));
        // Find first empty row and write error
        for (let y = 0; y < newBuf.length; y++) {
          const text = newBuf[y].map(c => c.char).join('').trim();
          if (text === '') {
            const msg = `ERROR${lineInfo}: ${errorMsg}`;
            for (let x = 0; x < msg.length && x < 80; x++) {
              newBuf[y][x] = { char: msg[x], fg: '#FF5555', bg: '#000000' };
            }
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
    if (interpreterRef.current) {
      interpreterRef.current.abort();
    }
    setIsRunning(false);
    setStatus('stopped');
  };

  const handleClear = () => {
    setBuffer(undefined);
    setStatus('ready');
    setCode('');
    setLiveLintSummary({ errors: 0, warnings: 0, infos: 0 });
    setLintLines(new Map());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const handleLoadExample = (example: string) => {
    handleCodeChange(example);
  };

  const handleExport = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'program.bas';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        handleCodeChange(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRenumber = useCallback(() => {
    const result = renumber(code, 10, 10);
    if (result.success) {
      handleCodeChange(result.code);
      setStatus('ready');
    }
  }, [code, handleCodeChange]);

  const handleSortAndRenumber = useCallback(() => {
    const result = sortAndRenumber(code, 10, 10);
    if (result.success) {
      handleCodeChange(result.code);
      setStatus('ready');
    }
  }, [code, handleCodeChange]);

  const handleLint = useCallback(() => {
    const result = lint(code);
    setLintResult(result);
    setShowLintPanel(true);
  }, [code]);

  const handleAutoFix = useCallback(() => {
    const result = autoFix(code);
    if (result.fixes > 0) {
      handleCodeChange(result.code);
      // Re-run lint after fixes
      const lintResult = lint(result.code);
      setLintResult(lintResult);
    }
  }, [code, handleCodeChange]);

  const handleScrollToLine = useCallback((line: number) => {
    // Focus a hidden textarea to allow navigation; use the editor's internal mechanism
    const highlightEl = document.getElementById('editor-highlight');
    const textarea = document.querySelector('textarea');
    if (textarea) {
      // Calculate approximate scroll position: each line ~ 1.5em * 14px = 21px
      const lineHeight = 21;
      const targetScroll = Math.max(0, (line - 1) * lineHeight - 100);
      textarea.scrollTop = targetScroll;
      if (highlightEl) highlightEl.scrollTop = targetScroll;
      // Briefly highlight the line
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
      if (rest.length > 0) {
        setCurrentInputPrompt(rest[0].prompt);
      } else {
        setCurrentInputPrompt(null);
      }
    }
  }, []);

  // Build lint badge text
  const lintBadge = (() => {
    const { errors, warnings } = liveLintSummary;
    if (errors === 0 && warnings === 0) return null;
    const parts: string[] = [];
    if (errors > 0) parts.push(`ERR:${errors}`);
    if (warnings > 0) parts.push(`WARN:${warnings}`);
    return parts.join(' ');
  })();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#000000',
        color: '#00FF00',
        fontFamily: '"IBM Plex Mono", monospace',
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: '#0A0A0A',
          borderBottom: '2px solid #00FF00',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
            ▓▓ GWBASIC Interpreter v1.0 ▓▓
            {status === 'running' && <span style={{ color: '#00FF00', fontSize: '12px', border: '1px solid #00FF00', padding: '2px 6px' }}>RUNNING</span>}
            {status === 'stopped' && <span style={{ color: '#FFAA00', fontSize: '12px', border: '1px solid #FFAA00', padding: '2px 6px' }}>STOPPED</span>}
            {status === 'ready' && <span style={{ color: '#006600', fontSize: '12px', border: '1px solid #006600', padding: '2px 6px' }}>READY</span>}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#006600' }}>
            Authentic BASIC Language Emulator — F5: Run | F6: Renumber | F7: Lint | F1: Help
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRun}
            disabled={isRunning}
            style={{
              backgroundColor: '#00FF00',
              color: '#000000',
              border: 'none',
              padding: '8px 16px',
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 'bold',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.5 : 1,
              transition: 'all 0.1s',
            }}
          >
            ▶ RUN
          </button>

          {isRunning && (
            <button
              onClick={handleStop}
              style={{
                backgroundColor: '#FF0000',
                color: '#000000',
                border: 'none',
                padding: '8px 16px',
                fontFamily: '"IBM Plex Mono", monospace',
                fontWeight: 'bold',
                cursor: 'pointer',
                animation: 'pulse 1s infinite',
              }}
            >
              ■ STOP
            </button>
          )}

          <button
            onClick={handleClear}
            disabled={isRunning}
            style={{
              backgroundColor: '#FFAA00',
              color: '#000000',
              border: 'none',
              padding: '8px 16px',
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 'bold',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.5 : 1,
              transition: 'all 0.1s',
            }}
          >
            ✕ CLEAR
          </button>

          {/* Tools dropdown menu */}
          <div ref={toolsMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setToolsMenuOpen(prev => !prev)}
              disabled={isRunning}
              style={{
                backgroundColor: '#0A0A0A',
                color: '#00FF00',
                border: '1px solid #00FF00',
                padding: '8px 12px',
                fontFamily: '"IBM Plex Mono", monospace',
                fontWeight: 'bold',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                opacity: isRunning ? 0.5 : 1,
                transition: 'all 0.1s',
              }}
            >
              ☰ TOOLS ▾
            </button>

            {toolsMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #00FF00',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  zIndex: 1000,
                  minWidth: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <ToolsMenuItem
                  label="▲ LINT (F7)"
                  onClick={() => { handleLint(); setToolsMenuOpen(false); }}
                  accent
                />
                <ToolsMenuItem
                  label="✨ AUTO-FIX"
                  onClick={() => { handleAutoFix(); setToolsMenuOpen(false); }}
                  accent
                />
                <ToolsMenuItem
                  label="# RENUMBER (F6)"
                  onClick={() => { handleRenumber(); setToolsMenuOpen(false); }}
                />
                <div style={{ height: '1px', backgroundColor: '#006600' }} />
                <ToolsMenuItem
                  label="💾 EXPORT"
                  onClick={() => { handleExport(); setToolsMenuOpen(false); }}
                />
                <ToolsMenuItem
                  label="📂 IMPORT"
                  onClick={() => { handleImport(); setToolsMenuOpen(false); }}
                />
                <div style={{ height: '1px', backgroundColor: '#006600' }} />
                <ToolsMenuItem
                  label="? HELP (F1)"
                  onClick={() => { setHelpOpen(true); setToolsMenuOpen(false); }}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="main-content" style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '8px', padding: '8px' }}>
        {/* Editor panel */}
        <div
          style={{
            flex: '0 0 50%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              backgroundColor: '#0A0A0A',
              padding: '8px 12px',
              borderBottom: '1px solid #00FF00',
              fontSize: '12px',
              color: '#006600',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>EDITOR</span>
            {lintBadge && (
              <span
                style={{
                  color: liveLintSummary.errors > 0 ? '#FF5555' : '#FFAA00',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  border: liveLintSummary.errors > 0 ? '1px solid #FF5555' : '1px solid #FFAA00',
                  padding: '1px 6px',
                }}
                title="Live lint issues"
              >
                ⚠ {lintBadge}
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor code={code} onChange={handleCodeChange} />
          </div>
        </div>

        {/* Terminal panel */}
        <div
          style={{
            flex: '0 0 50%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              backgroundColor: '#0A0A0A',
              padding: '8px 12px',
              borderBottom: '1px solid #00FF00',
              fontSize: '12px',
              color: '#006600',
            }}
          >
            OUTPUT
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Terminal buffer={buffer} onInput={handleInput} inputPrompt={currentInputPrompt} cursorX={cursorPos.x} cursorY={cursorPos.y} inputColor={inputColor} />
          </div>
        </div>
      </div>

      {/* Footer with examples */}
      <footer
        style={{
          backgroundColor: '#0A0A0A',
          borderTop: '2px solid #00FF00',
          padding: '8px 16px',
          fontSize: '12px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          color: '#006600',
          overflowY: 'auto',
          maxHeight: '60px',
        }}
      >
        <span>Examples:</span>
        {Object.entries(EXAMPLES).map(([key, example]) => (
          <button
            key={key}
            onClick={() => handleLoadExample(example)}
            style={{
              backgroundColor: 'transparent',
              color: '#00FF00',
              border: '1px solid #00FF00',
              padding: '2px 8px',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.1s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#00FF00';
              (e.target as HTMLButtonElement).style.color = '#000000';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.target as HTMLButtonElement).style.color = '#00FF00';
            }}
          >
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </footer>

      {/* Lint results panel */}
      {showLintPanel && lintResult && (
        <div
          style={{
            position: 'fixed',
            bottom: '68px',
            right: '16px',
            width: '480px',
            maxHeight: '320px',
            backgroundColor: '#0A0A0A',
            border: `2px solid ${lintResult.success ? '#00FF00' : '#FFAA00'}`,
            borderRadius: '4px',
            padding: '12px',
            zIndex: 100,
            overflow: 'auto',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #006600', paddingBottom: '6px' }}>
            <span style={{ color: lintResult.success ? '#00FF00' : '#FFAA00', fontWeight: 'bold' }}>
              {lintResult.success ? '✓ LINT PASSED' : '✗ LINT ISSUES'}
            </span>
            <span style={{ color: '#006600' }}>{lintResult.summary}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {lintResult.warnings.length > 0 && (
                <button
                  onClick={handleAutoFix}
                  style={{
                    backgroundColor: '#003300',
                    color: '#00FF00',
                    border: '1px solid #00FF00',
                    padding: '2px 8px',
                    cursor: 'pointer',
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: '11px',
                  }}
                >
                  ✨ AUTO-FIX
                </button>
              )}
              <button
                onClick={() => setShowLintPanel(false)}
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
                ✕ CLOSE
              </button>
            </div>
          </div>
          {lintResult.warnings.length === 0 ? (
            <div style={{ color: '#006600', padding: '8px 0' }}>No issues found in your code.</div>
          ) : (
            <div>
              {lintResult.warnings.map((w, idx) => (
                <div
                  key={idx}
                  onClick={() => handleScrollToLine(w.line)}
                  style={{
                    padding: '4px 6px',
                    margin: '2px 0',
                    backgroundColor: w.type === 'error' ? '#1A0000' : w.type === 'warning' ? '#1A1A00' : '#001A00',
                    borderLeft: `3px solid ${w.type === 'error' ? '#FF5555' : w.type === 'warning' ? '#FFAA00' : '#00FF00'}`,
                    color: w.type === 'error' ? '#FF5555' : w.type === 'warning' ? '#FFAA00' : '#00AA00',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLDivElement).style.backgroundColor = '#002200'; }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLDivElement).style.backgroundColor = w.type === 'error' ? '#1A0000' : w.type === 'warning' ? '#1A1A00' : '#001A00';
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>
                    {w.code ? `[${w.code}] ` : ''}Line {w.line}:
                  </span>{' '}
                  {w.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <HelpPanel isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".bas,.txt,.b"
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />

      <style>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          background-color: #000000;
        }
        button:hover:not(:disabled) {
          filter: brightness(1.2);
        }
        button:active:not(:disabled) {
          transform: scale(0.98);
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @media (max-width: 768px) {
          .main-content {
            flex-direction: column !important;
          }
          .main-content > div {
            flex: 1 1 50% !important;
            min-height: 40vh !important;
          }
          header {
            flex-direction: column !important;
            gap: 8px !important;
          }
          header > div:first-child {
            text-align: center !important;
          }
        }
      `}</style>
    </div>
  );
}