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
		<div>
			<p>
				<code>.markuplintrc</code>
			</p>
			<div className="grid min-h-[10rem]">
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
