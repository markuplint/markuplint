import c from 'cli-color';
import * as Enquirer from 'enquirer';

const enquirer = Enquirer.prompt;

type SelectQuestion<T> = {
	message: string;
	choices: { name: string; value: T }[];
};

export async function select<T>(question: SelectQuestion<T>) {
	const res = await enquirer({
		...question,
		name: '__Q__',
		type: 'select',
		result(resName) {
			// @ts-ignore
			return this.options.choices.find(c => c.name === resName)?.value;
		},
	});
	// @ts-ignore
	return res['__Q__'] as T;
}

export async function multiSelect<T>(question: SelectQuestion<T>) {
	const res = await enquirer({
		...question,
		name: '__Q__',
		type: 'multiselect',
		result(names) {
			// @ts-ignore
			const map = this.map(names);
			// @ts-ignore
			const values = names.map(name => map[name]);
			return values;
		},
	});
	// @ts-ignore
	return res['__Q__'] as T[];
}

export async function input<T extends string = string>(question: string, validation?: RegExp) {
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const _res = await enquirer({
			message: question,
			name: '__Q__',
			type: 'input',
		});
		// @ts-ignore
		const res = _res['__Q__'] as T;

		if (validation && !validation.test(res)) {
			process.stdout.write(c.yellow('Oops! The name that you type is an invalid format.\n'));
			continue;
		}

		return res;
	}
}

export async function confirm(question: string, options?: { initial?: boolean }) {
	const res = await enquirer({
		message: question,
		name: '__Q__',
		type: 'confirm',
		initial: !!options?.initial,
	});
	// @ts-ignore
	return !!res['__Q__'];
}

export async function confirmSequence<T extends string = string>(
	questions: {
		message: string;
		name: T;
	}[],
) {
	const res = await enquirer<Record<T, boolean>>(
		questions.map(question => {
			return {
				...question,
				type: 'confirm',
			};
		}),
	);
	return res;
}
