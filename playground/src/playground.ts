import type { Ruleset } from '@markuplint/ml-core';

import { editor } from 'monaco-editor';

import { diagnose } from './diagnose';
import { decode } from './utils';

const defaultSample = `<!doctype html>
<html
  LANG="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv = "X-UA-Compatible" content="ie=edge">
	<title>Document</title>
	<script src="/path/to/js/lib/jquery.min.js"></script>
	<script src="/path/to/js/main.js" async></script>
</head>
<body>
	<DIV
		class = "a-b-c">
		<p>lorem</p>
	</DIV>

	<p id="dupl">
		<span id="dupl">duplicated</span>
	</p>

	<p>
		Illegal &("> <'')&
		<br />
		characters &amp;(&quot;&gt; &lt;'')&amp;
		<img src="path/to" alt='&("<")& &amp;(&quot;&gt; &lt;&quot;)&amp;'>
	</p>

	<p>ホ゜ケットモンスター</p>
	<font color="red">非推奨要素</font>

	<a href="path/to" role="button">link1</a>
	<a href="path/to" role="document">link2</a>
	<label role="button"><input type="text" ></label>
	<img src="path/to">
	<img src="path/to" />
			   invalid-indent

	<?template engine;
		$var = '<html attr="value">text</html>'
	?>

	<%template engine;
		$var = '<html attr="value">text</html>'
	%>

	</expected>

	<div>

	EOD
	</body>
</html>
`;

export default class Playground {
	#rulesetString: string;
	#ruleset: Ruleset;
	#editor: editor.IStandaloneCodeEditor;
	#rafId = 0;

	constructor(el: HTMLElement, ruleset?: string) {
		const initCode = location.hash ? decode(location.hash.slice(1)) : defaultSample;

		this.#editor = editor.create(el, {
			theme: 'vs-dark',
			value: initCode,
			language: 'html',
		});

		this.#rulesetString = ruleset || '';
		this.#ruleset = convertRuleset(ruleset);

		const onChange = this._onChange.bind(this);

		this.#editor.onDidBlurEditorText(onChange);
		this.#editor.onDidBlurEditorWidget(onChange);
		this.#editor.onKeyUp(onChange);
		this.#editor.onDidPaste(onChange);

		onChange();
	}

	changeRuleset(ruleset: string) {
		if (ruleset === this.#rulesetString) {
			return;
		}
		this.#rulesetString = ruleset || '';
		this.#ruleset = convertRuleset(ruleset);
		this._onChange();
	}

	private _onChange() {
		cancelAnimationFrame(this.#rafId);
		const model = this.#editor.getModel();
		this.#rafId = requestAnimationFrame(async () => {
			if (model) {
				const diagnotics = await diagnose(model.getValue(), this.#ruleset);
				editor.setModelMarkers(model, 'markuplint', diagnotics);
			}
		});
	}
}

function convertRuleset(ruleset?: string) {
	return ruleset
		? JSON.parse(ruleset)
		: {
				rules: {},
				nodeRules: [],
				childNodeRules: [],
		  };
}
