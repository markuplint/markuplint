import type { Violations } from '../modules/violations';

import { useId } from 'react';

export const ProblemsOutput = ({ violations }: Readonly<{ violations: Violations | null }>) => {
	const headingId = useId();
	return (
		<section aria-labelledby={headingId} className="grid grid-rows-[auto_minmax(0,1fr)] text-sm">
			<h3 id={headingId} className="flex items-center gap-2 bg-slate-50 px-3 py-1 text-base font-bold">
				Problems
				{violations && (
					<span className="rounded-full bg-slate-200 px-1.5 py-1 text-xs leading-none">
						{violations.length}
					</span>
				)}
			</h3>
			<div className="h-full overflow-y-auto">
				{violations === null ? (
					<p className="p-3 pb-6">Loading...</p>
				) : violations.length === 0 ? (
					<p className="p-3 pb-6">
						<span className="mr-2 inline-block min-w-[9ch] rounded bg-sky-200 px-1 text-center font-bold text-sky-900">
							Info
						</span>
						<span>No problems found.</span>
					</p>
				) : (
					<ul className="grid gap-2 p-3 pb-6">
						{[...violations]
							.sort((a, b) => {
								const lineDiff = a.line - b.line;
								const colDiff = a.col - b.col;
								if (lineDiff === 0) {
									return colDiff;
								} else {
									return lineDiff;
								}
							})
							.map((violation, i) => (
								<li key={i} className="flex items-baseline gap-2">
									{icon(violation.severity)}
									<span>
										{violation.message} ({violation.ruleId}) [{violation.line}:{violation.col}]
									</span>
								</li>
							))}
					</ul>
				)}
			</div>
		</section>
	);
};

const icon = (severity: Violations[number]['severity']) => {
	switch (severity) {
		case 'info': {
			return (
				<span className="inline-block min-w-[9ch] rounded bg-sky-200 px-1 text-center font-bold text-sky-900">
					Info
				</span>
			);
		}
		case 'warning': {
			return (
				<span className="inline-block min-w-[9ch] rounded bg-yellow-200 px-1 text-center font-bold text-yellow-900">
					Warning
				</span>
			);
		}
		case 'error': {
			return (
				<span className="inline-block min-w-[9ch] rounded bg-red-200 px-1 text-center font-bold text-red-900">
					Error
				</span>
			);
		}
	}
};
