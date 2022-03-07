import { getFile } from './ml-file';
import { resolveParser } from './resolve-parser';

test('resolveParser', async () => {
	const { parser, parserModName, matched } = await resolveParser(getFile('angular.html'), {
		'.html$': 'markuplint-angular-parser',
	});
	expect(parser).toStrictEqual(
		// @ts-expect-error
		// eslint-disable-next-line import/no-unresolved -- fake module
		await import('markuplint-angular-parser'),
	);
	expect(parserModName).toBe('markuplint-angular-parser');
	expect(matched).toBe(true);
});
