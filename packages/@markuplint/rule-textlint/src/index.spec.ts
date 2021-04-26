import * as markuplint from 'markuplint';
// @ts-ignore This has not types
import Prh from 'textlint-rule-prh';
import path from 'path';

// Auto loading
// import rule from './';

test('is test 1', async () => {
	const r = await markuplint.verify(
		`<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="X-UA-Compatible" content="ie=edge">
			<title>Document</title>
		</head>
		<body>
			<h1>Title</h1>
			<p>This not use jquery.</p>
		</body>
		</html>`,
		{
			rules: {
				textlint: {
					option: {
						rules: [
							{
								ruleId: 'prh',
								rule: Prh,
								options: {
									rulePaths: [path.resolve(__dirname, '../', 'prh.yml')],
								},
							},
						],
					},
				},
			},
		},
		// Auto loading
		[],
		'en',
	);

	expect(r).toStrictEqual([
		{
			severity: 'warning',
			ruleId: 'textlint',
			line: 12,
			col: 20,
			raw: 'jquery',
			message: 'Invalid text: jquery => jQuery',
		},
	]);

	expect(() =>
		markuplint.execSync({
			sourceCodes: 'text',
			config: {
				rules: {
					textlint: true,
				},
			},
		}),
	).toThrowError('`verifySync` finished async. Use `verify` instead');
});
