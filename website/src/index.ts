import { decode } from './utils';
import { diagnose } from './diagnose';
import monacoEditor from './monaco-editor';

const el = document.getElementById('playground');
monacoEditor(
	el!,
	async () => {
		const req = await fetch('./resources/sample.html');
		const sample = await req.text();

		let code = sample;
		if (location.hash) {
			code = decode(location.hash.slice(1));
		}

		return code;
	},
	diagnose,
);
