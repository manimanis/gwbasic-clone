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
import Editor from '@/components/Editor';
import Terminal from '@/components/Terminal';
import HelpPanel from '@/components/HelpPanel';

const STORAGE_KEY = 'gwbasic-code';

interface InputRequest {
  prompt: string;
  resolve: (value: string) => void;
}

export default function Home() {
  const [code, setCode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || `10 PRINT "Welcome to GWBASIC Interpreter!"
20 PRINT "Type your program and click RUN"
30 PRINT ""
40 PRINT "Example:"
50 PRINT "FOR I = 1 TO 10"
60 PRINT "  PRINT I"
70 PRINT "NEXT I"`;
    } catch {
      return `10 PRINT "Welcome to GWBASIC Interpreter!"
20 PRINT "Type your program and click RUN"
30 PRINT ""
40 PRINT "Example:"
50 PRINT "FOR I = 1 TO 10"
60 PRINT "  PRINT I"
70 PRINT "NEXT I"`;
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
  const interpreterRef = useRef<GWBASICInterpreter | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist code to localStorage
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    try {
      localStorage.setItem(STORAGE_KEY, newCode);
    } catch {
      // Ignore storage quota errors
    }
  }, []);

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
            Authentic BASIC Language Emulator — F5: Run | F1: Help
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

          <button
            onClick={handleExport}
            disabled={isRunning}
            style={{
              backgroundColor: '#006600',
              color: '#00FF00',
              border: '1px solid #00FF00',
              padding: '8px 16px',
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 'bold',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.5 : 1,
              transition: 'all 0.1s',
            }}
          >
            💾 EXPORT
          </button>

          <button
            onClick={handleImport}
            disabled={isRunning}
            style={{
              backgroundColor: '#006600',
              color: '#00FF00',
              border: '1px solid #00FF00',
              padding: '8px 16px',
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 'bold',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.5 : 1,
              transition: 'all 0.1s',
            }}
          >
            📂 IMPORT
          </button>

          <button
            onClick={() => setHelpOpen(true)}
            style={{
              backgroundColor: '#006600',
              color: '#00FF00',
              border: '1px solid #00FF00',
              padding: '8px 16px',
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >
            ? HELP
          </button>
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
            }}
          >
            EDITOR
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