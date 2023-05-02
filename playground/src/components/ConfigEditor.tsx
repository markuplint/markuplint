import type { editor } from 'monaco-editor';

import MonacoEditor from '@monaco-editor/react';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { configFormats } from '../modules/config-formats';
import { debounce } from '../modules/debounce';
import { getLanguage } from '../modules/monaco-editor';

export type ConfigEditorRef = {
	getValue: () => string;
	setValue: (code: string) => void;
	getFilename: () => string;
	setFilename: (filename: string) => void;
};

type Props = {
	onChangeValue?: (code: string) => void;
	onChangeFilename?: (filename: string) => void;
};

export const ConfigEditor = forwardRef<ConfigEditorRef, Props>(({ onChangeValue, onChangeFilename }, ref) => {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
	const [filenameState, setFilenameState] = useState<string>(configFormats[0]);

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

	return (
		<>
			<label>
				Filename:
				<select
					value={filenameState}
					onChange={e => {
						setFilenameState(e.target.value);
						onChangeFilename?.(e.target.value);
					}}
				>
					{configFormats.map(filename => (
						<option key={filename} value={filename}>
							{filename}
						</option>
					))}
				</select>
			</label>
			<MonacoEditor
				language={getLanguage(filenameState) ?? 'json'}
				theme="vs-dark"
				options={{
					minimap: { enabled: false },
					fontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
				}}
				onMount={(editor, _monaco) => {
					editorRef.current = editor;
				}}
				onChange={debounce(value => {
					if (typeof value !== 'undefined') {
						onChangeValue?.(value);
					}
				}, 500)}
			/>
		</>
	);
});
