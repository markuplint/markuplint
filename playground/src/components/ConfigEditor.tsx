import type { editor } from 'monaco-editor';

import MonacoEditor from '@monaco-editor/react';
import { useRef } from 'react';

import { configFormats } from '../modules/config-formats';
import { getLanguage } from '../modules/monaco-editor';

type Props = Readonly<{
	value: string;
	onChangeValue?: (code: string) => void;
	filename: string;
	onChangeFilename?: (filename: string) => void;
}>;

export const ConfigEditor = ({ value, onChangeValue, filename, onChangeFilename }: Props) => {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

	return (
		<div>
			<label className="py-2 px-4 flex flex-wrap gap-1 justify-start items-center">
				Config filename:
				<select
					className="border border-gray-400 rounded-md px-1"
					value={filename}
					onChange={e => {
						onChangeFilename?.(e.target.value);
					}}
				>
					{configFormats.map(name => (
						<option key={name} value={name}>
							{name}
						</option>
					))}
				</select>
			</label>
			<div className="grid min-h-[10rem]">
				<MonacoEditor
					language={getLanguage(filename) ?? 'json'}
					theme="vs-dark"
					options={{
						minimap: { enabled: false },
						lineNumbers: 'off',
						fontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
					}}
					value={value}
					onMount={(editor, _monaco) => {
						editorRef.current = editor;
					}}
					onChange={value => {
						if (value !== undefined) {
							onChangeValue?.(value);
						}
					}}
				/>
			</div>
		</div>
	);
};
