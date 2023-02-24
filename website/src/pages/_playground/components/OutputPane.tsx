import React from 'react';
import { Report } from '../modules/lint';

export default function Output({ reports }: { reports: readonly Report[] }) {
  return (
    <div style={{ maxHeight: '100%', overflowY: 'auto' }}>
      <ul>
        {reports.map((report, i) => (
          <li key={i}>
            <span>{icon(report.severity)}</span>
            <span>{report.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const icon = (severity: Report['severity']) => {
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
