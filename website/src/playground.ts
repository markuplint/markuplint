import { Ruleset } from '@markuplint/ml-core';
import { decode } from './utils';
// @ts-ignore
import defaultSample from 'html-loader?-attributes!./sample-code/playground.html';
import { diagnose } from './diagnose';
import { editor } from 'monaco-editor';

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
