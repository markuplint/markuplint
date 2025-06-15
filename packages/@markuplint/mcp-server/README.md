# @markuplint/mcp-server

**Markuplint MCP Server** - A Model Context Protocol (MCP) server that provides natural language descriptions of Markuplint rules for AI agents.

## Overview

This package enables AI coding agents to correctly understand and follow Markuplint rules before generating code. It reads Markuplint configuration files (e.g., `.markuplintrc`) and provides human-readable descriptions in Markdown format.

## Features

- 🔮 **Prompt-time rule guidance** for AI agents like Cursor or Claude
- 📚 **Clear, centralized rule-sharing** among team members
- 🧠 **Interactive rule explanations** inside editors
- 📄 **Markdown output** with enabled/disabled rule status

## Installation

```bash
npm install @markuplint/mcp-server
```

## Usage

### Command Line

```bash
# Start the MCP server
npx markuplint-mcp-server
```

### Programmatic Usage

```typescript
import { MarkuplintMcpServer } from '@markuplint/mcp-server';

const server = new MarkuplintMcpServer();
await server.start();
```

## Example Output

Given a Markuplint configuration:

```json
{
  "rules": {
    "required-attr": true,
    "required-h1": false,
    "wai-aria": "error"
  }
}
```

The MCP server will output:

```markdown
# Markuplint Rules Configuration

## Enabled Rules

- ✅ **required-attr**: Warns if specified attributes or required attribute on specs are not appeared on an element.
- ✅ **wai-aria**: Warns against any use of inaccessible ARIA attributes.

## Disabled Rules

- ❌ **required-h1**: Warn if there is no h1 element in the document.
```

## License

MIT