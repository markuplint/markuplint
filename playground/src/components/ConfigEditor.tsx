import type { editor } from 'monaco-editor';

import MonacoEditor from '@monaco-editor/react';
import { useRef } from 'react';

type Props = Readonly<{
	value: string;
	onChange?: (code: string) => void;
}>;

export const ConfigEditor = ({ value, onChange }: Props) => {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

	return (
		<div className="grid min-h-[20rem] grid-cols-1">
			<MonacoEditor
				language={'json'}
				theme="vs-dark"
				options={{
					minimap: { enabled: false },
					lineNumbers: 'off',
					fontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
					tabSize: 2,
					renderWhitespace: 'all',
				}}
				value={value}
				onMount={(editor, monaco) => {
					editorRef.current = editor;
					monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
						comments: 'ignore',
					});
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
