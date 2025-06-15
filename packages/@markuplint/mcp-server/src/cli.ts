#!/usr/bin/env node

import { MarkuplintMcpServer } from './server.js';

const server = new MarkuplintMcpServer();
await server.start();
