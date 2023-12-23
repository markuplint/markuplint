#!/usr/bin/env node

import { createRule } from '../lib/cli.js';

await createRule().catch(error => {
	process.stderr.write(error + '\n');
	process.exit(1);
});
process.exit(0);
