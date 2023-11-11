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
		<div>
			<p className="py-2 px-4">
				<code>package.json</code> &gt; <code>devDependencies</code>
			</p>
			<div className="grid min-h-[10rem]">
				<MonacoEditor
					language="json"
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
			<div className="py-2 px-4">
				{status === 'loading' ? (
					<p>Installing...</p>
				) : status === 'error' ? (
					<p>Error loading packages</p>
				) : status === 'success' ? (
					<>
						<p>Installed:</p>
						<ul>
							{Object.entries(installedPackages).map(([name, version]) => (
								<li key={name}>
									{name}@{version}
								</li>
							))}
						</ul>
					</>
				) : null}
			</div>
		</div>
	);
});
