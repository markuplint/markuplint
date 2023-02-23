import React from 'react';
import { Diagnostic } from '../types';

export const Output = (props: { diagnostics: readonly Diagnostic[] }) => {
  return (
    <div style={{ maxHeight: '100%', overflowY: 'auto' }}>
      <ul>
        {props.diagnostics.map((diagnostic, i) => (
          <li key={i}>
            <span>{icon(diagnostic.severity)}</span>
            <span>{diagnostic.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const icon = (severity: Diagnostic['severity']) => {
  switch (severity) {
    case 1: {
      return '💡';
    }
    case 2: {
      return 'ℹ️';
    }
    case 4: {
      return '\u26A0\uFE0F';
    }
    case 8: {
      return '✖';
    }
  }
};
