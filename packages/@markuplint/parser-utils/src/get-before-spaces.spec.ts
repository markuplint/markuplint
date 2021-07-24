import { getBeforeSpaces } from './get-before-spaces';

it('test', () => {
	expect(
		getBeforeSpaces(
			7,
			`<div>
	<span>test</span>
</div>`,
		),
	).toStrictEqual({
		raw: '\n\t',
		startOffset: 5,
		endOffset: 7,
		startLine: 1,
		endLine: 2,
		startCol: 6,
		endCol: 2,
		indent: {
			raw: '\t',
			width: 1,
			type: 'tab',
			startOffset: 6,
			endOffset: 7,
			startLine: 2,
			endLine: 2,
			startCol: 1,
			endCol: 2,
		},
	});
});

it('test', () => {
	expect(getBeforeSpaces(5, '<div><span>test</span></div>')).toBeNull();
});
