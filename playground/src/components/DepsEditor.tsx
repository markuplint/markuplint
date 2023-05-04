import type { editor } from 'monaco-editor';

import MonacoEditor from '@monaco-editor/react';
import { forwardRef, useImperativeHandle, useRef } from 'react';

import { debounce } from '../modules/debounce';

export type DepsEditorRef = {
	getValue: () => string;
	setValue: (code: string) => void;
};

type Props = {
	status: 'success' | 'loading' | 'error';
	installedPackages: Record<string, string>;
	onChangeValue?: (code: string) => void;
};

export const DepsEditor = forwardRef<DepsEditorRef, Props>(({ onChangeValue, installedPackages, status }, ref) => {
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

	return (
		<div className="h-full grid grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] grid-cols-[minmax(0,auto)]">
			<p className="py-2 px-4">
				<code>package.json</code> &gt; <code>devDependencies</code>
			</p>
			<MonacoEditor
				language="json"
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
			<div className="py-2 px-4 overflow-y-auto">
				{status === 'loading' ? (
					<p>Loading...</p>
				) : status === 'error' ? (
					<p>Error loading packages</p>
				) : status === 'success' ? (
					<>
						<p>Installed:</p>
						<pre>{JSON.stringify(installedPackages, null, 2)}</pre>
					</>
				) : null}
			</div>
		</div>
	);
});
