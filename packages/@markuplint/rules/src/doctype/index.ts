import { createRule } from '@markuplint/ml-core';

type Value = 'always';
type Option = {
	denyObsoleteType: boolean;
};

export default createRule<Value, Option>({
	defaultValue: 'always',
	defaultOptions: {
		denyObsoleteType: true,
	},
	verify(context) {
		if (context.document.isFragment) {
			return;
		}

		const doctype = context.document.doctype;

		if (!doctype) {
			context.report({
				message: context.translate('Require {0}', 'doctype'),
				line: 1,
				col: 1,
				raw: '',
			});
			return;
		}

		if ((doctype.name.toLowerCase() === 'html' && doctype.publicId) || doctype.systemId) {
			context.report({
				scope: doctype,
				message: context.translate('Never {0} {1}', 'declare', 'obsolete doctype'),
			});
		}
	},
});
