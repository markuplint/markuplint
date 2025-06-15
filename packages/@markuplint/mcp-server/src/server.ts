import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ConfigToMarkdown, type Config } from './config-to-markdown.js';

export interface MarkuplintMcpOptions {
	/** Working directory to search for config files */
	cwd?: string;
	/** Specific config file path */
	configPath?: string;
}

/**
 * Markuplint MCP Server
 * Provides natural language descriptions of Markuplint rules for AI agents
 */
export class MarkuplintMcpServer {
	private server: Server;

	constructor(options: MarkuplintMcpOptions = {}) {
		this.server = new Server(
			{
				name: 'markuplint-mcp-server',
				version: '1.0.0',
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		this.setupHandlers();
	}

	private setupHandlers() {
		// List available tools
		this.server.setRequestHandler(ListToolsRequestSchema, () => {
			return {
				tools: [
					{
						name: 'get_markuplint_rules',
						description: 'Get natural language descriptions of Markuplint rules from configuration',
						inputSchema: {
							type: 'object',
							properties: {
								configPath: {
									type: 'string',
									description:
										'Path to Markuplint configuration file (optional, will search automatically if not provided)',
								},
								cwd: {
									type: 'string',
									description:
										'Working directory to search for config files (defaults to current directory)',
								},
							},
						},
					},
					{
						name: 'explain_markuplint_rule',
						description: 'Get detailed explanation of a specific Markuplint rule',
						inputSchema: {
							type: 'object',
							properties: {
								ruleName: {
									type: 'string',
									description: 'Name of the Markuplint rule to explain',
								},
							},
							required: ['ruleName'],
						},
					},
				],
			};
		});

		// Handle tool calls
		this.server.setRequestHandler(CallToolRequestSchema, request => {
			const { name, arguments: args } = request.params;

			switch (name) {
				case 'get_markuplint_rules': {
					return this.getMarkuplintRules(args as { configPath?: string; cwd?: string });
				}

				case 'explain_markuplint_rule': {
					return this.explainMarkuplintRule(args as { ruleName: string });
				}

				default: {
					throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
				}
			}
		});
	}

	/**
	 * Get Markuplint rules from configuration and convert to markdown
	 */
	private async getMarkuplintRules(args: Readonly<{ configPath?: string; cwd?: string }>) {
		try {
			const workingDir = args.cwd || process.cwd();
			let config: Config;

			if (args.configPath) {
				// Load specific config file
				const absolutePath = path.resolve(workingDir, args.configPath);
				config = await this.loadConfigFile(absolutePath);
			} else {
				// Search for config file automatically
				config = await this.findAndLoadConfig(workingDir);
			}

			const markdown = ConfigToMarkdown.configToMarkdown(config);

			return {
				content: [
					{
						type: 'text',
						text: markdown,
					},
				],
			};
		} catch (error) {
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to load Markuplint configuration: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Load a configuration file from a specific path
	 */
	private async loadConfigFile(filePath: string): Promise<Config> {
		try {
			const configText = await fs.readFile(filePath, 'utf8');

			if (filePath.endsWith('.json') || filePath.endsWith('.markuplintrc')) {
				return JSON.parse(configText);
			}

			// Try parsing as JSON by default
			return JSON.parse(configText);
		} catch (error) {
			throw new Error(
				`Failed to load config file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Find and load configuration file from a directory
	 */
	private async findAndLoadConfig(workingDir: string): Promise<Config> {
		const configFileNames = ['.markuplintrc', '.markuplintrc.json', 'markuplint.config.json'];

		for (const fileName of configFileNames) {
			const filePath = path.join(workingDir, fileName);
			try {
				const stat = await fs.stat(filePath);
				if (stat.isFile()) {
					return await this.loadConfigFile(filePath);
				}
			} catch {
				// File doesn't exist, try next
				continue;
			}
		}

		// If no config file found, check package.json
		try {
			const packageJsonPath = path.join(workingDir, 'package.json');
			const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
			if (packageJson.markuplint) {
				return packageJson.markuplint;
			}
		} catch {
			// package.json doesn't exist or doesn't have markuplint config
		}

		// Return default config if no configuration found
		return {
			rules: {},
		};
	}

	/**
	 * Handle the explain_markuplint_rule tool
	 */
	private explainMarkuplintRule(args: { ruleName: string }): { content: Array<{ type: string; text: string }> } {
		const { ruleName } = args;

		const ruleDetails = ConfigToMarkdown.getRuleDetails(ruleName);
		if (!ruleDetails) {
			return {
				content: [
					{
						type: 'text',
						text: `Rule "${ruleName}" is not a known built-in Markuplint rule. It may be a custom rule or plugin rule. Please refer to your project's documentation for details about this rule.`,
					},
				],
			};
		}

		const markdown = `# ${ruleDetails.name}

**Category**: ${ruleDetails.category || 'unknown'}

**Description**: ${ruleDetails.description}

This is a built-in Markuplint rule. For more detailed documentation including configuration examples, please refer to the official Markuplint documentation at https://markuplint.dev/rules/${ruleName}.`;

		return {
			content: [
				{
					type: 'text',
					text: markdown,
				},
			],
		};
	}

	/**
	 * Start the MCP server
	 */
	async start() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		// eslint-disable-next-line no-console
		console.error('Markuplint MCP server started');
	}
}
