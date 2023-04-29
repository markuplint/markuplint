const { getFile } = require('../lib/ml-file');
const { resolveParser } = require('../lib/resolve-parser');

test('resolveParser', async () => {
	const { parser, parserModName, matched } = await resolveParser(getFile('angular.html'), {
		'.html$': 'markuplint-angular-parser',
	});
	expect(parser.parse).toStrictEqual(require('markuplint-angular-parser').parse);
	expect(parserModName).toBe('markuplint-angular-parser');
	expect(matched).toBe(true);
});
