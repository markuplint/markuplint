import { decode } from './utils';
import { diagnose } from './diagnose';
import { editor } from 'monaco-editor';

export default async function (el: HTMLElement) {
	let diagnoseId: number;

	const req = await fetch('./resources/sample.html');
	const sample = await req.text();

	let code = sample;
	if (location.hash) {
		code = decode(location.hash.slice(1));
	}

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
