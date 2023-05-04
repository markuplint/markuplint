import type { Violations } from '../modules/violations';
import type { editor } from 'monaco-editor';

import MonacoEditor, { type Monaco } from '@monaco-editor/react';
import { forwardRef, useRef, useEffect, useImperativeHandle, useState } from 'react';

import { debounce } from '../modules/debounce';
import { getLanguage } from '../modules/monaco-editor';
import { convertToMarkerData } from '../modules/violations';

export type CodeEditorRef = {
	getValue: () => string;
	setValue: (code: string) => void;
	getFilename: () => string;
	setFilename: (filename: string) => void;
};

type Props = {
	violations: Violations;
	onChangeValue?: (code: string) => void;
	onChangeFilename?: (filename: string) => void;
};

export const CodeEditor = forwardRef<CodeEditorRef, Props>(({ violations, onChangeValue, onChangeFilename }, ref) => {
	const monacoRef = useRef<Monaco | null>(null);
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
	const [filenameState, setFilenameState] = useState<string>('code.html');

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
				getFilename: () => {
					return filenameState;
				},
				setFilename: (filename: string) => {
					setFilenameState(filename);
				},
			};
		},
		[filenameState],
	);

	useEffect(() => {
		const markers = convertToMarkerData(violations);
		const model = editorRef.current?.getModel();
		if (model) {
			monacoRef.current?.editor.setModelMarkers(model, 'Markuplint', markers);
		}
	}, [violations]);

	return (
		<div className="h-full grid grid-rows-[auto,minmax(0,1fr)] grid-cols-[minmax(0,auto)]">
			<label className="py-2 px-4 grid grid-flow-col gap-1 justify-start items-center">
				Filename:
				<input
					className="border border-gray-400 rounded-md px-1"
					type="text"
					value={filenameState}
					onChange={e => {
						setFilenameState(e.currentTarget.value);
						onChangeFilename?.(e.currentTarget.value);
					}}
				/>
			</label>
			<MonacoEditor
				language={getLanguage(filenameState) ?? 'plaintext'}
				theme="vs-dark"
				options={{
					minimap: { enabled: false },
					fontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
				}}
				onMount={(editor, monaco) => {
					editorRef.current = editor;
					monacoRef.current = monaco;
				}}
				onChange={debounce(value => {
					if (typeof value !== 'undefined') {
						onChangeValue?.(value);
					}
				}, 200)}
			/>
		</div>
	);
});
