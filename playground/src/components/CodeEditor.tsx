import type { Violations } from '../modules/violations';
import type { editor } from 'monaco-editor';

import MonacoEditor, { type Monaco } from '@monaco-editor/react';
import { shikiToMonaco } from '@shikijs/monaco';
import { useRef, useEffect, useId } from 'react';
import { getHighlighter } from 'shiki/bundle/web';

import { getLanguage } from '../modules/monaco-editor';
import { convertToMarkerData } from '../modules/violations';

type Props = Readonly<{
	value: string;
	filename: string;
	violations: Violations;
	onChange?: (code: string) => void;
}>;

export const CodeEditor = ({ value, filename, violations, onChange }: Props) => {
	const headingId = useId();
	const monacoRef = useRef<Monaco | null>(null);
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

	useEffect(() => {
		const markers = convertToMarkerData(violations);
		const model = editorRef.current?.getModel();
		if (model) {
			monacoRef.current?.editor.setModelMarkers(model, 'Markuplint', markers);
		}
	}, [violations]);

	return (
		<section aria-labelledby={headingId}>
			<div className="grid h-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)]">
				<div className="flex min-h-[2.5rem] items-center bg-slate-100">
					<hgroup className="flex items-baseline gap-2 px-4 py-1">
						<h2
							id={headingId}
							className="sr-only flex items-baseline gap-2 text-lg font-bold md:not-sr-only"
						>
							<span className="icon-heroicons-solid-code translate-y-[0.15em] text-xl text-slate-500"></span>
							Code
						</h2>
						<p className="text-sm">
							<code>{filename}</code>
						</p>
					</hgroup>
				</div>
				<MonacoEditor
					language={getLanguage(filename) ?? 'plaintext'}
					theme="vs-dark"
					options={{
						minimap: { enabled: false },
						fontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
						tabSize: 2,
						renderWhitespace: 'all',
						lineNumbersMinChars: 4,
					}}
					value={value}
					onMount={(editor, monaco) => {
						editorRef.current = editor;
						monacoRef.current = monaco;

						void (async () => {
							const ADDITIONAL_LANGUAGES = ['jsx', 'tsx', 'vue', 'svelte'] as const satisfies Parameters<
								typeof getHighlighter
							>[0]['langs'];

							for (const lang of ADDITIONAL_LANGUAGES) {
								monacoRef.current?.languages.register({ id: lang });
							}

							const highlighter = await getHighlighter({
								themes: ['dark-plus'],
								langs: ADDITIONAL_LANGUAGES,
							});

							// https://shiki.matsu.io/packages/monaco
							shikiToMonaco(highlighter, monacoRef.current);
						})();
					}}
					onChange={value => {
						if (value !== undefined) {
							onChange?.(value);
						}
					}}
				/>
			</div>
		</section>
	);
};
