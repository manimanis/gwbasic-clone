/**
 * Retro Terminal Component
 * Renders a cell-based terminal buffer with per-character fg/bg colors
 * Support for inline input at cursor position, arrow key editing, and memoization.
 */

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';

interface TerminalCell {
  char: string;
  fg: string;
  bg: string;
}

interface TerminalProps {
  buffer?: TerminalCell[][];
  onInput?: (input: string) => void;
  inputPrompt?: string | null;
  cursorX?: number;
  cursorY?: number;
  inputColor?: string;
}

const TerminalComponent: React.FC<TerminalProps> = ({
  buffer,
  onInput,
  inputPrompt,
  cursorX = 0,
  cursorY = 0,
  inputColor = '#AAAAAA',
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [inputBuffer, setInputBuffer] = useState('');
  const [cursorIndex, setCursorIndex] = useState(0);

  const inputMode = inputPrompt !== null && inputPrompt !== undefined;

  // Reset input state when a new prompt appears
  useEffect(() => {
    if (inputMode) {
      setInputBuffer('');
      setCursorIndex(0);
      if (terminalRef.current) {
        terminalRef.current.focus();
      }
    }
  }, [inputPrompt]);

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [buffer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!inputMode) return;
    if (e.key === 'Enter') {
      if (onInput) onInput(inputBuffer);
      setInputBuffer('');
      setCursorIndex(0);
    } else if (e.key === 'Backspace') {
      if (cursorIndex > 0) {
        setInputBuffer(prev => prev.slice(0, cursorIndex - 1) + prev.slice(cursorIndex));
        setCursorIndex(prev => prev - 1);
      }
    } else if (e.key === 'Delete') {
      setInputBuffer(prev => prev.slice(0, cursorIndex) + prev.slice(cursorIndex + 1));
    } else if (e.key === 'ArrowLeft') {
      if (cursorIndex > 0) setCursorIndex(prev => prev - 1);
    } else if (e.key === 'ArrowRight') {
      if (cursorIndex < inputBuffer.length) setCursorIndex(prev => prev + 1);
    } else if (e.key === 'Home') {
      setCursorIndex(0);
    } else if (e.key === 'End') {
      setCursorIndex(inputBuffer.length);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setInputBuffer(prev => prev.slice(0, cursorIndex) + e.key + prev.slice(cursorIndex));
      setCursorIndex(prev => prev + 1);
    }
  }, [inputMode, inputBuffer, cursorIndex, onInput]);

  // Convert buffer rows to trimmed text lines for display
  const displayLines: TerminalCell[][] = React.useMemo(() => {
    if (!buffer || buffer.length === 0) return [];
    let lastRow = buffer.length - 1;
    while (lastRow >= 0) {
      const row = buffer[lastRow];
      const text = row.map(c => c.char).join('').trim();
      if (text.length > 0) break;
      lastRow--;
    }
    const lines: TerminalCell[][] = [];
    for (let i = 0; i <= lastRow; i++) {
      lines.push(buffer[i]);
    }
    return lines;
  }, [buffer]);

  return (
    <div
      ref={terminalRef}
      className="terminal-container"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        padding: '16px',
        overflow: 'auto',
        whiteSpace: 'pre',
        position: 'relative',
        boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.1)',
      }}
    >
      {/* Scanlines effect */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0px, rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)',
          pointerEvents: 'none',
          animation: 'scanlines 8s linear infinite',
        }}
      />

      {/* Output text with inline input */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {displayLines.map((row, rowIndex) => (
          <div key={rowIndex} style={{ minHeight: '1.5em', whiteSpace: 'pre' }}>
            {row.map((cell, cellIndex) => {
              // If this is the cursor row and we're at the cursor position, render input inline
              if (inputMode && rowIndex === cursorY && cellIndex === cursorX) {
                return (
                  <React.Fragment key={cellIndex}>
                    <span style={{ color: inputColor }}>{inputBuffer}</span>
                    {cursorVisible && (
                      <span style={{ backgroundColor: inputColor, color: '#000000' }}>_</span>
                    )}
                  </React.Fragment>
                );
              }
              // If this is the cursor row and we're past the cursor position + input length, skip
              if (inputMode && rowIndex === cursorY && cellIndex >= cursorX + inputBuffer.length) {
                return null;
              }
              return (
                <span
                  key={cellIndex}
                  style={{
                    color: cell.fg,
                    backgroundColor: cell.bg,
                  }}
                >
                  {cell.char}
                </span>
              );
            })}
            {/* If cursor is at the end of the row */}
            {inputMode && rowIndex === cursorY && cursorX >= row.length && (
              <span>
                <span style={{ color: inputColor }}>{inputBuffer}</span>
                {cursorVisible && (
                  <span style={{ backgroundColor: inputColor, color: '#000000' }}>_</span>
                )}
              </span>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes scanlines {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
        .terminal-container:focus { outline: none; box-shadow: inset 0 0 20px rgba(0, 255, 0, 0.2); }
        .terminal-container { scrollbar-width: thin; scrollbar-color: #00FF00 #000000; }
        .terminal-container::-webkit-scrollbar { width: 8px; }
        .terminal-container::-webkit-scrollbar-track { background: #000000; }
        .terminal-container::-webkit-scrollbar-thumb { background: #00FF00; border-radius: 4px; }
        .terminal-container::-webkit-scrollbar-thumb:hover { background: #00DD00; }
      `}</style>
    </div>
  );
};

export const Terminal = memo(TerminalComponent);
export default Terminal;