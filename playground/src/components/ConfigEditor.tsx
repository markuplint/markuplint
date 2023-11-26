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
		<div className="p-4">
			<p className="mb-2">
				<code>.markuplintrc</code>
			</p>
			<div className="grid grid-cols-1 min-h-[20rem]">
				<MonacoEditor
					language={'json'}
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
							onChange?.(value);
						}
					}}
				/>
			</div>
		</div>
	);
};
