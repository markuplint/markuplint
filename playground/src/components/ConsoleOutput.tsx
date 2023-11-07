import 'xterm/css/xterm.css';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

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
			const fitAddon = new FitAddon();
			terminal.loadAddon(fitAddon);

			terminal.open(wrapperRef.current);
			fitAddon.fit();

			const resizeObserver = new ResizeObserver(() => {
				fitAddon.fit();
			});
			resizeObserver.observe(wrapperRef.current);

			return () => {
				terminal.dispose();
				terminalRef.current = null;
				resizeObserver.disconnect();
			};
		}
	}, []);

	useImperativeHandle(
		ref,
		() => {
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
		},
		[],
	);

	return <div className="h-full p-2" ref={wrapperRef}></div>;
});
