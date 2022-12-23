import util from 'node:util';

import syncGlob from 'glob';

const glob = util.promisify(syncGlob);

export default glob;
