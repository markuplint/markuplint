import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js';

import { bootServer } from './server.js';

// `createConnection` without streams reads the transport from argv: `--stdio`, `--node-ipc`,
// `--socket=<port>` or `--pipe=<name>`.
bootServer(createConnection(ProposedFeatures.all));
