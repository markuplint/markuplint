import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';

import { bootServer } from './server.js';

// `createConnection` without streams reads the transport from argv: `--stdio`, `--node-ipc`,
// `--socket=<port>` or `--pipe=<name>`. That Node.js transport is why this file imports
// `vscode-languageserver/node`; the rest of the server needs only the package root. The subpath
// is `/node`, not `/node.js`: the package's `exports` map has no `.js` key.
bootServer(createConnection(ProposedFeatures.all));
