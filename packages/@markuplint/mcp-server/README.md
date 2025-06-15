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

## Maintenance

### Updating Rule Metadata

The MCP server includes a static database of rule descriptions to ensure it works without network access. However, this data may become outdated when `@markuplint/rules` is updated.

To update the rule metadata:

```bash
npm run update-rules
```

This script:
1. Reads the latest rule descriptions from `@markuplint/rules/src/*/README.md`
2. Extracts categories from `@markuplint/rules/src/*/meta.ts`
3. Updates the static database in `src/config-to-markdown.ts`

**When to run:**
- After updating the `@markuplint/rules` package
- Before releasing a new version of the MCP server
- When contributing rule description changes

For production deployments requiring always-fresh data, consider implementing the `fetchLatestRuleMetadata()` function which can fetch rule descriptions directly from GitHub.

## License

MIT