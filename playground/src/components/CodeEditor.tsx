import type { Violations } from '../modules/violations';
import type { editor } from 'monaco-editor';

import MonacoEditor, { type Monaco } from '@monaco-editor/react';
import { useRef, useEffect } from 'react';

import { getLanguage } from '../modules/monaco-editor';
import { convertToMarkerData } from '../modules/violations';

type Props = Readonly<{
	value: string;
	filename: string;
	violations: Violations;
	onChange?: (code: string) => void;
}>;

export const CodeEditor = ({ value, filename, violations, onChange }: Props) => {
	const monacoRef = useRef<Monaco | null>(null);
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

	useEffect(() => {
		const markers = convertToMarkerData(violations);
		const model = editorRef.current?.getModel();
		if (model) {
			monacoRef.current?.editor.setModelMarkers(model, 'Markuplint', markers);
		}
	}, [violations]);

	return (
		<div className="h-full grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)]">
			<hgroup className="flex gap-2 items-baseline py-1 px-4 bg-slate-100">
				<h2 className="text-lg font-bold flex items-baseline gap-2">
					<span className=" icon-heroicons-solid-code text-slate-500 text-xl translate-y-[0.15em]"></span>
					Code
				</h2>
				<p className="text-sm">
					<code>{filename}</code>
				</p>
			</hgroup>
			<MonacoEditor
				language={getLanguage(filename) ?? 'plaintext'}
				theme="vs-dark"
				options={{
					minimap: { enabled: false },
					fontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
					tabSize: 2,
					renderWhitespace: 'all',
					lineNumbersMinChars: 4,
				}}
				value={value}
				onMount={(editor, monaco) => {
					editorRef.current = editor;
					monacoRef.current = monaco;
				}}
				onChange={value => {
					if (value !== undefined) {
						onChange?.(value);
					}
				}}
			/>
		</div>
	);
};
