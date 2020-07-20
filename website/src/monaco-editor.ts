import { Diagnose } from './diagnose';
import { editor } from 'monaco-editor';

export default async function (el: HTMLElement, init: () => Promise<string>, diagnose: Diagnose) {
	let diagnoseId: number;

	const code = await init();

	const theEditor = editor.create(el, {
		theme: 'vs-dark',
		value: code,
		language: 'html',
	});

	const onChange = () => {
		cancelAnimationFrame(diagnoseId);
		diagnoseId = requestAnimationFrame(async () => {
			const model = theEditor.getModel();
			if (model) {
				const diagnotics = await diagnose(model);
				editor.setModelMarkers(model, 'markuplint', diagnotics);
			}
		});
	};

	onChange();
	theEditor.onDidBlurEditorText(onChange);
	theEditor.onDidBlurEditorWidget(onChange);
	theEditor.onKeyUp(onChange);
	theEditor.onDidPaste(onChange);
}
