import 'xterm/css/xterm.css';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal } from 'xterm';

export type ConsoleOutputRef = {
	appendLine: (string: string) => void;
	append: (string: string) => void;
	clear: () => void;
};

type Props = {};

export const ConsoleOutput = forwardRef<ConsoleOutputRef, Props>((_, ref) => {
	const terminalRef = useRef<Terminal | null>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (wrapperRef.current) {
			const elementStyle = window.getComputedStyle(wrapperRef.current);
			const terminal = new Terminal({
				theme: {
					background: elementStyle.backgroundColor,
					foreground: elementStyle.color,
				},
			});
			terminalRef.current = terminal;
			terminal.open(wrapperRef.current);
			return () => {
				terminal.dispose();
				terminalRef.current = null;
			};
		}
	}, []);

	useImperativeHandle(ref, () => {
		return {
			appendLine: (line: string) => {
				terminalRef.current?.writeln(line);
			},
			append: (string: string) => {
				terminalRef.current?.write(string);
			},
			clear: () => {
				terminalRef.current?.clear();
			},
		};
	}, []);

	return <div className="bg-slate-900 p-4 text-white" style={{ colorScheme: 'dark' }} ref={wrapperRef}></div>;
});
