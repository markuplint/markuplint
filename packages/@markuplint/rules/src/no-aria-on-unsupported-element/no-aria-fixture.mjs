// An extended spec whose `div` and `svg` take no ARIA attribute. No element of the bundled spec data
// does, so the rule has no other way to reach its report.
export default {
	specs: [
		{ name: 'div', globalAttrs: { '#ARIAAttrs': false } },
		{ name: 'svg:svg', globalAttrs: { '#ARIAAttrs': false } },
	],
};
