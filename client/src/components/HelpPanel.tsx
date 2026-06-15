/**
 * Help Panel Component
 * Displays GWBASIC documentation and reference
 */

import React, { useState } from 'react';
import { HELP } from '@/lib/help';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'intro' | 'statements' | 'functions' | 'operators' | 'tips'>('intro');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#000000',
          border: '2px solid #00FF00',
          borderRadius: '4px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#0A0A0A',
            borderBottom: '1px solid #00FF00',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, color: '#00FF00', fontSize: '16px' }}>
            GWBASIC Help Reference
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              color: '#00FF00',
              border: '1px solid #00FF00',
              padding: '4px 8px',
              fontFamily: '"IBM Plex Mono", monospace',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #00FF00',
            backgroundColor: '#0A0A0A',
          }}
        >
          {(['intro', 'statements', 'functions', 'operators', 'tips'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                backgroundColor: activeTab === tab ? '#00FF00' : 'transparent',
                color: activeTab === tab ? '#000000' : '#00FF00',
                border: 'none',
                padding: '8px',
                fontFamily: '"IBM Plex Mono", monospace',
                cursor: 'pointer',
                fontSize: '12px',
                borderRight: '1px solid #00FF00',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            color: '#00FF00',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '12px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
        >
          {activeTab === 'intro' && <div>{HELP.introduction}</div>}

          {activeTab === 'statements' && (
            <div>
              {Object.entries(HELP.statements).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#FFAA00', fontWeight: 'bold' }}>{key}</div>
                  <div>{value}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'functions' && (
            <div>
              {Object.entries(HELP.functions).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '12px' }}>
                  <div style={{ color: '#FFAA00', fontWeight: 'bold' }}>{key}</div>
                  <div>{value}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'operators' && (
            <div>
              {Object.entries(HELP.operators).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#FFAA00', fontWeight: 'bold' }}>{key.toUpperCase()}</div>
                  <div>{value}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tips' && <div>{HELP.tips}</div>}
        </div>

        <style>{`
          div::-webkit-scrollbar {
            width: 8px;
          }
          div::-webkit-scrollbar-track {
            background: #000000;
          }
          div::-webkit-scrollbar-thumb {
            background: #00FF00;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #00DD00;
          }
        `}</style>
      </div>
    </div>
  );
};

export default HelpPanel;
