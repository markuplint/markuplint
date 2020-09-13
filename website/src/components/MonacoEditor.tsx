import { useCallback, useEffect, useState } from 'react';
import { diagnose } from '../modules/diagnose';
import dynamic from 'next/dynamic';
import { editor } from 'monaco-editor';

const MonacoEditorBase = dynamic(import('react-monaco-editor'), { ssr: false });

const ruleset = {
	rules: {
		'attr-duplication': true,
		'character-reference': true,
		'deprecated-attr': true,
		'deprecated-element': true,
		doctype: true,
		'id-duplication': true,
		'permitted-contents': true,
		'required-attr': true,
		'invalid-attr': true,
		'landmark-roles': true,
		'required-h1': true,
		'class-naming': '/[a-z]+/',
		'attr-equal-space-after': true,
		'attr-equal-space-before': true,
		'attr-spacing': true,
		'attr-value-quotes': true,
		'case-sensitive-attr-name': true,
		'case-sensitive-tag-name': true,
		indentation: false,
	},
	nodeRules: [
		{
			tagName: 'meta',
			rules: {
				'invalid-attr': {
					option: {
						attrs: {
							property: {
								type: 'String',
							},
							content: {
								type: 'String',
							},
						},
					},
				},
			},
		},
	],
	childNodeRules: [],
};

export default function MonacoEditor() {
	const [postBody, setPostBody] = useState('');
	const [rafId, updateRafId] = useState(0);
	const [codeEditor, setCodeEditor] = useState<editor.IStandaloneCodeEditor | null>(null);

	const onChange = useCallback(() => {
		if (!codeEditor) {
			return;
		}
		cancelAnimationFrame(rafId);
		const model = codeEditor.getModel();
		updateRafId(
			requestAnimationFrame(async () => {
				if (model) {
					const diagnotics = await diagnose(model.getValue(), ruleset);
					console.log(diagnotics);
					editor.setModelMarkers(model, 'markuplint', diagnotics);
				}
			}),
		);
	}, [codeEditor, rafId]);

	useEffect(
		() => {
			if (!codeEditor) {
				return;
			}
			codeEditor.onDidBlurEditorText(onChange);
			codeEditor.onDidBlurEditorWidget(onChange);
			codeEditor.onKeyUp(onChange);
			codeEditor.onDidPaste(onChange);

			// eslint-disable-next-line no-console
			console.log('Initialize Code Editor');
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[codeEditor],
	);

	const initialize = useCallback((codeEditor: editor.IStandaloneCodeEditor) => {
		// @ts-ignore
		window.MonacoEnvironment.getWorkerUrl = (_moduleId: string, label: string) => {
			if (label === 'json') return '_next/static/json.worker.js';
			if (label === 'css') return '_next/static/css.worker.js';
			if (label === 'html') return '_next/static/html.worker.js';
			if (label === 'typescript' || label === 'javascript') return '_next/static/ts.worker.js';
			return '_next/static/editor.worker.js';
		};
		setCodeEditor(codeEditor);
	}, []);

	return (
		<div>
			{/* etc */}
			<MonacoEditorBase
				editorDidMount={initialize}
				width="800"
				height="600"
				language="html"
				theme="vs-dark"
				value={postBody}
				onChange={setPostBody}
			/>
		</div>
	);
}
