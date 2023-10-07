import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// eslint-disable-next-line import/default
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';

export async function createMonaco() {
	self.MonacoEnvironment = {
		getWorker: function (_moduleId: any, label: string) {
			if (label === 'html') {
				return new htmlWorker();
			}
			return new editorWorker();
		},
	};

	const monacoEditor = await import('monaco-editor');

	return monacoEditor;
}
