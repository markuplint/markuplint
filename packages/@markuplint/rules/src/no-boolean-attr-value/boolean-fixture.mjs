// An extended spec whose `svg` takes a Boolean `flag` attribute. No SVG element of the bundled
// spec data has a Boolean attribute, so the rule has no other way to report on one.
export default {
	specs: [{ name: 'svg:svg', attributes: { flag: { type: 'Boolean' } } }],
};
