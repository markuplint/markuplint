/* global monaco */

/**
 *
 * @param {HTMLElement} el
 * @param {Function} init
 * @param {Function} diagnose
 */
export default function (el, init, diagnose) {
	let diagnoseId;

	window.require.config({ paths: { vs: 'monaco-editor/min/vs' } });
	window.require(['vs/editor/editor.main'], async () => {
		const { code, localeSets } = await init();

		const editor = monaco.editor.create(el, {
			theme: 'vs-dark',
			value: code,
			language: 'html',
		});

		const onChange = () => {
			cancelAnimationFrame(diagnoseId);
			diagnoseId = requestAnimationFrame(async () => {
				const model = editor.getModel();
				if (model) {
					const diagnotics = await diagnose(model, localeSets);
					monaco.editor.setModelMarkers(model, 'markuplint', diagnotics);
				}
			});
		};

		onChange();
		editor.onDidBlurEditorText(onChange);
		editor.onDidBlurEditorWidget(onChange);
		editor.onKeyUp(onChange);
		editor.onDidPaste(onChange);
	});
}
