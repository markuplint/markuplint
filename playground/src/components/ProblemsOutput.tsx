import type { Violations } from '../modules/violations';
import type { FC } from 'react';

export const ProblemsOutput: FC<{ violations: Violations }> = ({ violations }) => {
	return (
		<div style={{ maxHeight: '100%', overflowY: 'auto' }}>
			<p>{violations.length}</p>
			<ul>
				{violations.map((violation, i) => (
					<li key={i}>
						<span>{icon(violation.severity)}</span>
						<span>{violation.message}</span>
					</li>
				))}
			</ul>
		</div>
	);
};

const icon = (severity: Violations[number]['severity']) => {
	switch (severity) {
		case 'info': {
			return 'ℹ️';
		}
		case 'warning': {
			return '\u26A0\uFE0F';
		}
		case 'error': {
			return '❌';
		}
	}
};
