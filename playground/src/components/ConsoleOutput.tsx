import ansiRegex from 'ansi-regex';
import { forwardRef, useImperativeHandle, useState } from 'react';

export type ConsoleOutputRef = {
	appendLine: (string: string) => void;
	append: (string: string) => void;
	clear: () => void;
};

type Props = {};

const CHA = '\u001b[1G'; // Cursor Horizontal Absolute
let nextCHA = false;

export const ConsoleOutput = forwardRef<ConsoleOutputRef, Props>((_, ref) => {
	const [log, setLog] = useState<string>('');

	useImperativeHandle(
		ref,
		() => {
			return {
				appendLine: (line: string) => {
					setLog(log => `${log ? `${log}\n` : ''}${line}\n`);
				},
				append: (string: string) => {
					const CHALines = `${nextCHA ? CHA : ''}${string}`.split(CHA);
					CHALines.forEach((line, index) => {
						if (index !== 0) {
							setLog(log => {
								const cursorPosition = log.lastIndexOf('\n');
								if (cursorPosition !== -1) {
									return `${log.slice(0, cursorPosition + 1)}`;
								} else {
									return log;
								}
							});
						}

						setLog(log => `${log}${line.replaceAll(ansiRegex(), '')}`);
					});
					nextCHA = string.endsWith(CHA);
				},
				clear: () => {
					setLog('');
				},
			};
		},
		[],
	);

	return <pre className="whitespace-pre-wrap p-2">{log}</pre>;
});
