import { MLRuleOptions, createRule } from '@markuplint/ml-core';

type Value = 'always';
type Option = {
	denyObsolateType: boolean;
};

const verifySync: MLRuleOptions<Value, Option>['verifySync'] = (document, translate, rule) => {
	if (document.isFragment) {
		return [];
	}

	const doctype = document.doctype;

	if (!doctype) {
		return [
			{
				severity: rule.severity,
				message: translate('Required {0}', 'doctype'),
				line: 1,
				col: 1,
				raw: '',
			},
		];
	}

	if ((doctype.name.toLowerCase() === 'html' && doctype.publicId) || doctype.systemId) {
		return [
			{
				severity: rule.severity,
				message: translate('Never {0} {1}', 'declarate', 'obsolete doctype'),
				line: doctype.startLine,
				col: doctype.startCol,
				raw: doctype.raw,
			},
		];
	}

	return [];
};

export default createRule<Value, Option>({
	name: 'doctype',
	defaultValue: 'always',
	defaultOptions: {
		denyObsolateType: true,
	},
	verify: verifySync,
	verifySync,
});
