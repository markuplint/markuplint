import { memo } from 'react';
import { useAppSelector } from './store/hooks';
import { Severity } from './types';

export const Logger = memo(() => {
	const diagnotics = useAppSelector(state => state.log.diagnotics);

	return (
		<ul className="p-3">
			{diagnotics.map((diagnotic, i) => (
				<li key={`diagnotic${i}`}>
					<span>{icon(diagnotic.severity)}</span>
					<span>{diagnotic.message}</span>
				</li>
			))}
		</ul>
	);
});

function icon(severity: Severity) {
	switch (severity) {
		case 1: {
			return '⚡';
		}
		case 2: {
			return '(i)';
		}
		case 4: {
			return '\u26A0\uFE0F';
		}
		case 8: {
			return '🚫';
		}
	}
}
