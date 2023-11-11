import type { Violations } from '../modules/violations';
import type { editor } from 'monaco-editor';

import MonacoEditor, { type Monaco } from '@monaco-editor/react';
import { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';

import { debounce } from '../modules/debounce';
import { getLanguage } from '../modules/monaco-editor';
import { convertToMarkerData } from '../modules/violations';

export type CodeEditorRef = {
	getValue: () => string;
	setValue: (code: string) => void;
};

type Props = {
	filename: string;
	violations: Violations;
	onChangeValue?: (code: string) => void;
};

export const CodeEditor = forwardRef<CodeEditorRef, Props>(({ filename, violations, onChangeValue }, ref) => {
	const monacoRef = useRef<Monaco | null>(null);
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

	useImperativeHandle(
		ref,
		() => {
			return {
				getValue: () => {
					return editorRef.current?.getValue() ?? '';
				},
				setValue: (code: string) => {
					editorRef.current?.setValue(code);
				},
			};
		},
		[],
	);

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
				onMount={(editor, monaco) => {
					editorRef.current = editor;
					monacoRef.current = monaco;
				}}
				onChange={debounce(value => {
					if (value !== undefined) {
						onChangeValue?.(value);
					}
				}, 200)}
			/>
		</div>
	);
});
