/**
 * Code Editor Component
 * Monospace editor for GWBASIC programs
 * 
 * Design: Rétro Terminal Authentique
 * - Green phosphor text on black background
 * - Line numbers
 * - Syntax highlighting for GWBASIC keywords
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GWBASIC_KEYWORDS, GWBASIC_FUNCTIONS } from '@shared/gwbasic-constants';

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
}

export const Editor: React.FC<EditorProps> = ({ code, onChange, readOnly = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineNumbers, setLineNumbers] = useState<string[]>([]);

  useEffect(() => {
    updateLineNumbers();
  }, [code]);

  const updateLineNumbers = () => {
    const lines = code.split('\n');
    const numbers = lines.map((_, i) => (i + 1).toString());
    setLineNumbers(numbers);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;

    // Tab to spaces
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

  const syntaxHighlight = useCallback((text: string) => {
    // Process raw text -> insert HTML spans -> NO escaping needed since we use dangerouslySetInnerHTML
    // Order matters: do most specific replacements first, then broader ones
    // Replacements NEVER match inside inserted HTML because we use placeholders
    
    // Step 1: Highlight strings with a placeholder approach
    let result = '';
    let i = 0;
    const segments: Array<{ type: 'string' | 'comment' | 'number' | 'keyword' | 'function' | 'text'; content: string }> = [];
    let currentSegment = '';
    
    const flushText = () => {
      if (currentSegment) {
        // Highlight numbers in plain text
        const parts = currentSegment.split(/(\b\d+\.?\d*\b)/g);
        for (let j = 0; j < parts.length; j++) {
          if (j % 2 === 0) {
            // Text - highlight keywords and functions
            const words = parts[j].split(/(\b[A-Za-z_][A-Za-z0-9_$%!#]*\b)/g);
            for (let k = 0; k < words.length; k++) {
              if (k % 2 === 0) {
                segments.push({ type: 'text', content: words[k] });
              } else {
                const upper = words[k].toUpperCase();
                if (GWBASIC_KEYWORDS.includes(upper)) {
                  segments.push({ type: 'keyword', content: words[k] });
                } else if (GWBASIC_FUNCTIONS.includes(upper)) {
                  segments.push({ type: 'function', content: words[k] });
                } else {
                  segments.push({ type: 'text', content: words[k] });
                }
              }
            }
          } else {
            segments.push({ type: 'number', content: parts[j] });
          }
        }
        currentSegment = '';
      }
    };

    while (i < text.length) {
      // String literal
      if (text[i] === '"') {
        flushText();
        let str = '"';
        i++;
        while (i < text.length && text[i] !== '"') {
          str += text[i];
          i++;
        }
        if (i < text.length) {
          str += '"';
          i++;
        }
        segments.push({ type: 'string', content: str });
        continue;
      }

      // REM comment
      if ((text[i] === 'R' && text.substring(i, i + 3) === 'REM' && (i + 3 >= text.length || !/[A-Za-z0-9_]/.test(text[i + 3]))) || text[i] === "'") {
        flushText();
        let comment = '';
        while (i < text.length && text[i] !== '\n') {
          comment += text[i];
          i++;
        }
        segments.push({ type: 'comment', content: comment });
        continue;
      }

      currentSegment += text[i];
      i++;
    }
    flushText();

    // Build HTML
    for (const seg of segments) {
      switch (seg.type) {
        case 'string':
          result += `<span style="color: #FFAA00;">${seg.content}</span>`;
          break;
        case 'comment':
          result += `<span style="color: #006600;">${seg.content}</span>`;
          break;
        case 'number':
          result += `<span style="color: #00FF00;">${seg.content}</span>`;
          break;
        case 'keyword':
          result += `<span style="color: #FFAA00; font-weight: bold;">${seg.content}</span>`;
          break;
        case 'function':
          result += `<span style="color: #00DD00;">${seg.content}</span>`;
          break;
        default:
          result += seg.content;
      }
    }

    return result;
  }, []);

  const highlightedCode = syntaxHighlight(code);

  // Sync scroll between the invisible textarea and visible highlighted overlay
  const handleScroll = () => {
    const highlightEl = document.getElementById('editor-highlight');
    if (textareaRef.current && highlightEl) {
      highlightEl.scrollTop = textareaRef.current.scrollTop;
      highlightEl.scrollLeft = textareaRef.current.scrollLeft;
    }
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
      {/* Line numbers */}
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
        {lineNumbers.map((num, i) => (
          <div key={i} style={{ minHeight: '1.5em' }}>
            {num}
          </div>
        ))}
      </div>

      {/* Editor container: highlighted overlay + transparent textarea */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Highlighted overlay (visible layer) */}
        <div
          id="editor-highlight"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: '8px 12px',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflow: 'hidden',
            pointerEvents: 'none',
            color: '#00FF00',
            backgroundColor: '#000000',
          }}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />

        {/* Transparent textarea (interaction layer) */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          readOnly={readOnly}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            color: 'transparent',
            caretColor: '#00FF00',
            border: 'none',
            padding: '8px 12px',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            resize: 'none',
            outline: 'none',
            overflow: 'auto',
            zIndex: 1,
          }}
          spellCheck="false"
        />
      </div>

      <style>{`
        textarea {
          scrollbar-width: thin;
          scrollbar-color: #00FF00 #000000;
        }

        textarea::-webkit-scrollbar {
          width: 8px;
        }

        textarea::-webkit-scrollbar-track {
          background: #000000;
        }

        textarea::-webkit-scrollbar-thumb {
          background: #00FF00;
          border-radius: 4px;
        }

        textarea::-webkit-scrollbar-thumb:hover {
          background: #00DD00;
        }

        textarea::selection {
          background-color: #00FF00;
          color: #000000;
        }
      `}</style>
    </div>
  );
};

export default Editor;