// eslint-disable-next-line @typescript-eslint/no-var-requires
const crypto = require('crypto');

/**
 * for `uuid`, @see https://github.com/uuidjs/uuid#getrandomvalues-not-supported
 *
 * polyfill on node, `window.crypto` is not available on jsdom yet
 * 
 * @see https://github.com/jsdom/jsdom/issues/1612#issuecomment-783729297
 *
 * implementation from @see https://github.com/PeculiarVentures/webcrypto/blob/master/src/crypto.ts
 */
global.crypto = {
	getRandomValues: buffer => crypto.randomFillSync(buffer),
};
