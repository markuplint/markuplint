// An extended spec whose `svg` takes a `flag` attribute that is ineffective on every `svg`. No SVG
// attribute of the bundled spec data is ineffective, so the rule has no other way to report on one.
export default {
	specs: [{ name: 'svg:svg', attributes: { flag: { type: 'Any', ineffective: 'svg' } } }],
};
