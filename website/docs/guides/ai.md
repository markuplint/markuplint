# Using with AI

AI coding assistants can help you get the most out of Markuplint — from understanding warnings to writing configuration files.

## Understanding warnings

When Markuplint reports a violation, you can paste the error message into an AI assistant to get an explanation and suggested fix. Each violation includes a rule name (e.g., `attr-duplication`) that the AI can look up.

```
The attribute name is duplicated Markuplint(attr-duplication) [Ln 11, Col 45]
```

Ask your AI assistant:

- "What does this Markuplint warning mean?"
- "How do I fix this HTML to resolve `permitted-contents`?"

## Writing configuration files

AI assistants can generate Markuplint configuration files tailored to your project. Describe your setup and let the AI create the config:

- "Create a `.markuplintrc` for a React project"
- "Add a rule to enforce BEM class naming in my Markuplint config"
- "Configure Markuplint to allow the `data-testid` attribute"

## AI coding agents

AI coding agents such as [Claude Code](https://claude.ai/claude-code), [Cursor](https://www.cursor.com/), and [GitHub Copilot](https://github.com/features/copilot) can run Markuplint directly in your development workflow:

1. **Lint generated code** — Ask the agent to run `npx markuplint` after generating HTML
2. **Auto-fix violations** — The agent can interpret Markuplint's output and apply fixes
3. **Set up projects** — The agent can create a `.markuplintrc` file directly for your framework

:::info
`npx markuplint --init` is interactive and requires manual input. AI agents should write the configuration file directly instead. See [Beyond HTML](/docs/guides/beyond-html) for the parser and spec packages to include.
:::

:::tip
For AI agent developers: a dedicated [SKILL file for Markuplint](https://github.com/markuplint/markuplint/issues/3553) is planned to help agents use Markuplint more effectively.
:::

## Next steps

- **[Getting Started](/docs/guides)** — Install the VS Code extension and start linting
- **[Beyond HTML](/docs/guides/beyond-html)** — Set up parsers for your framework
- **[Configuration](/docs/configuration)** — Learn about all available configuration options
