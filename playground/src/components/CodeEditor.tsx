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
		<div className="h-full">
			<MonacoEditor
				language={getLanguage(filename) ?? 'plaintext'}
				theme="vs-dark"
				options={{
					minimap: { enabled: false },
					fontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
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