/**
 * Code Editor Component
 * Simple monospace editor for GWBASIC programs
 * - Line numbers
 * - Statement highlight in step mode
 */

import React, { useRef, useEffect, useState } from 'react';

export interface HighlightRange {
  line: number;        // 1-based editor line number
  startCol: number;    // 0-based start column within the line
  endCol: number;      // 0-based end column within the line
}

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
  highlightLine?: number | null;
  highlightRange?: HighlightRange | null;
}

export const Editor: React.FC<EditorProps> = ({ code, onChange, readOnly = false, highlightLine, highlightRange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineNumbers, setLineNumbers] = useState<string[]>([]);

  useEffect(() => {
    const lines = code.split('\n');
    setLineNumbers(lines.map((_, i) => (i + 1).toString()));
  }, [code]);

  // Auto-scroll to highlighted line
  useEffect(() => {
    const targetLine = highlightRange ? highlightRange.line : highlightLine;
    if (targetLine !== undefined && targetLine !== null && textareaRef.current) {
      const lineHeight = 21;
      const targetScroll = Math.max(0, (targetLine - 1) * lineHeight - 100);
      textareaRef.current.scrollTop = targetScroll;
    }
  }, [highlightLine, highlightRange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newCode = code.substring(0, start) + '  ' + code.substring(end);
        onChange(newCode);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  };

  const isLineHighlighted = (editorLine: number): boolean => {
    if (highlightRange && highlightRange.line === editorLine) return true;
    if (highlightLine === editorLine) return true;
    return false;
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        border: '2px solid #00FF00',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)',
        position: 'relative',
      }}
    >
      <div
        style={{
          backgroundColor: '#0A0A0A',
          color: '#006600',
          padding: '8px 12px',
          textAlign: 'right',
          borderRight: '1px solid #00FF00',
          userSelect: 'none',
          minWidth: '50px',
          overflow: 'hidden',
        }}
      >
        {lineNumbers.map((num, i) => {
          const highlighted = isLineHighlighted(i + 1);
          return (
            <div key={i} style={{ minHeight: '1.5em', backgroundColor: highlighted ? '#003300' : 'transparent' }}>
              <span style={{ color: highlighted ? '#00FF00' : '#006600', fontWeight: highlighted ? 'bold' : 'normal' }}>
                {num}
              </span>
            </div>
          );
        })}
      </div>

      <textarea
        ref={textareaRef}
        value={code}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck="false"
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          backgroundColor: '#000000',
          color: '#00FF00',
          caretColor: '#00FF00',
          border: 'none',
          padding: '8px 12px',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          resize: 'none',
          outline: 'none',
          overflow: 'auto',
          boxSizing: 'border-box',
        }}
      />

      <style>{`
        textarea { scrollbar-width: thin; scrollbar-color: #00FF00 #000000; }
        textarea::-webkit-scrollbar { width: 8px; }
        textarea::-webkit-scrollbar-track { background: #000000; }
        textarea::-webkit-scrollbar-thumb { background: #00FF00; border-radius: 4px; }
        textarea::-webkit-scrollbar-thumb:hover { background: #00DD00; }
        textarea::selection { background-color: #00FF00; color: #000000; }
      `}</style>
    </div>
  );
};

export default Editor;