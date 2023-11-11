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
		<div>
			<label className="py-2 px-4 flex flex-wrap gap-1 justify-start items-center">
				Config filename:
				<select
					className="border border-gray-400 rounded-md px-1"
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
			<div className="grid min-h-[10rem]">
				<MonacoEditor
					language={getLanguage(filenameState) ?? 'json'}
					theme="vs-dark"
					options={{
						minimap: { enabled: false },
						lineNumbers: 'off',
						fontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
					}}
					onMount={(editor, _monaco) => {
						editorRef.current = editor;
					}}
					onChange={debounce(value => {
						if (value !== undefined) {
							onChangeValue?.(value);
						}
					}, 500)}
				/>
			</div>
		</div>
	);
});
