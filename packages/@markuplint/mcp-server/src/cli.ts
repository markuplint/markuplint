#!/usr/bin/env node

import { MarkuplintMcpServer } from './server.js';

async function main() {
	const server = new MarkuplintMcpServer();
	await server.start();
}

main().catch((error) => {
	console.error('Failed to start Markuplint MCP server:', error);
	process.exit(1);
});