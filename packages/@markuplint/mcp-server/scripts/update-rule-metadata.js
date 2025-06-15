#!/usr/bin/env node

/**
 * Script to update the static rule metadata in config-to-markdown.ts
 * 
 * This script reads the actual README.md and meta.ts files from @markuplint/rules
 * and generates updated BUILTIN_RULES object code.
 * 
 * Usage:
 *   node update-rule-metadata.js
 * 
 * This addresses the concern about hard-coded rule descriptions becoming stale
 * when @markuplint/rules is updated.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the rules source directory
const RULES_DIR = join(__dirname, '../../../rules/src');
const CONFIG_FILE = join(__dirname, '../src/config-to-markdown.ts');

console.log('Updating rule metadata from @markuplint/rules...');
console.log('Rules directory:', RULES_DIR);
console.log('Config file:', CONFIG_FILE);

if (!existsSync(RULES_DIR)) {
	console.error('Rules directory not found. Make sure you are running this from the correct location.');
	process.exit(1);
}

// Get all rule directories
const ruleDirs = readdirSync(RULES_DIR, { withFileTypes: true })
	.filter(dirent => dirent.isDirectory())
	.map(dirent => dirent.name);

console.log(`Found ${ruleDirs.length} rule directories`);

const ruleMetadata = {};

for (const ruleName of ruleDirs) {
	const ruleDir = join(RULES_DIR, ruleName);
	const readmePath = join(ruleDir, 'README.md');
	const metaPath = join(ruleDir, 'meta.ts');
	
	let description = `Rule: ${ruleName}`;
	let category = undefined;
	
	// Extract description from README.md frontmatter
	if (existsSync(readmePath)) {
		try {
			const readmeContent = readFileSync(readmePath, 'utf8');
			const frontmatterMatch = readmeContent.match(/^---\s*\n([\s\S]*?)\n---/);
			
			if (frontmatterMatch) {
				const frontmatter = frontmatterMatch[1];
				const descriptionMatch = frontmatter.match(/description:\s*(.+)/);
				if (descriptionMatch) {
					description = descriptionMatch[1].trim();
				}
			}
		} catch (error) {
			console.warn(`Failed to read README for ${ruleName}:`, error.message);
		}
	}
	
	// Extract category from meta.ts
	if (existsSync(metaPath)) {
		try {
			const metaContent = readFileSync(metaPath, 'utf8');
			const categoryMatch = metaContent.match(/category:\s*['"`]([^'"`]+)['"`]/);
			if (categoryMatch) {
				category = categoryMatch[1];
			}
		} catch (error) {
			console.warn(`Failed to read meta for ${ruleName}:`, error.message);
		}
	}
	
	ruleMetadata[ruleName] = { description, category };
	console.log(`✓ ${ruleName}: ${description} (${category || 'no category'})`);
}

// Generate the new BUILTIN_RULES object
const ruleEntries = Object.entries(ruleMetadata)
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([name, { description, category }]) => {
		const categoryLine = category ? `\n\t\tcategory: '${category}',` : '';
		return `\t'${name}': {\n\t\tdescription: '${description.replace(/'/g, "\\'")}',${categoryLine}\n\t}`;
	})
	.join(',\n');

const newBuiltinRules = `const BUILTIN_RULES: Record<string, { description: string; category?: string }> = {\n${ruleEntries},\n};`;

// Read the current config file and replace the BUILTIN_RULES section
if (existsSync(CONFIG_FILE)) {
	const configContent = readFileSync(CONFIG_FILE, 'utf8');
	
	// Find the BUILTIN_RULES section and replace it
	const startPattern = /const BUILTIN_RULES: Record<string, \{ description: string; category\?: string \}> = \{/;
	const endPattern = /\};\s*\/\*\*/;
	
	const startMatch = configContent.match(startPattern);
	const endMatch = configContent.match(endPattern);
	
	if (startMatch && endMatch) {
		const beforeRules = configContent.substring(0, startMatch.index);
		const afterRules = configContent.substring(endMatch.index + 3); // +3 for "};"
		
		const newContent = beforeRules + newBuiltinRules + '\n\n/**' + afterRules;
		
		writeFileSync(CONFIG_FILE, newContent, 'utf8');
		console.log(`\n✅ Updated BUILTIN_RULES in ${CONFIG_FILE}`);
		console.log(`📊 Updated ${Object.keys(ruleMetadata).length} rules`);
	} else {
		console.error('❌ Could not find BUILTIN_RULES section to replace');
		process.exit(1);
	}
} else {
	console.error('❌ Config file not found');
	process.exit(1);
}