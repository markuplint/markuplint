import type { Violations } from '../modules/violations';
import type { FC } from 'react';

export const ProblemsOutput: FC<{ violations: Violations }> = ({ violations }) => {
	return (
		<div className="overflow-y-auto h-full">
			<ul className="grid gap-1 p-3 pb-6">
				{[...violations]
					.sort((a, b) => {
						const lineDiff = a.line - b.line;
						const colDiff = a.col - b.col;
						if (lineDiff !== 0) {
							return lineDiff;
						} else {
							return colDiff;
						}
					})
					.map((violation, i) => (
						<li key={i}>
							{icon(violation.severity)}
							<span>
								{violation.message} ({violation.ruleId}) [{violation.line}:{violation.col}]
							</span>
						</li>
					))}
			</ul>
		</div>
	);
};

const icon = (severity: Violations[number]['severity']) => {
	switch (severity) {
		case 'info': {
			return (
				<span className="inline-block font-bold rounded px-1 min-w-[9ch] mr-2 text-center bg-sky-200 text-sky-900 ">
					Info
				</span>
			);
		}
		case 'warning': {
			return (
				<span className="inline-block font-bold rounded px-1 min-w-[9ch] mr-2 text-center bg-yellow-200 text-yellow-900 ">
					Warning
				</span>
			);
		}
		case 'error': {
			return (
				<span className="inline-block font-bold rounded px-1 min-w-[9ch] mr-2 text-center bg-red-200 text-red-900 ">
					Error
				</span>
			);
		}
	}
};
