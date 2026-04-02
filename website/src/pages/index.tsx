import Hero from '@site/src/components/Hero';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Layout from '@theme/Layout';
import React from 'react';

export default function Home(): JSX.Element {
	return (
		<Layout
			title="Markuplint - An HTML linter for all markup developers."
			description="Peace of mind in your markup. An HTML linter for all markup developers."
		>
			<Hero getStarted="Get Started" rules="See rules" faq="Check FAQ" />
			<main>
				<HomepageFeatures
					heading="Main features"
					features={[
						{
							title: 'Conformance checking',
							symbol: '🚨',
							description: (
								<>
									Valid markup is the foundation of a reliable web. Markuplint checks your HTML
									against the HTML Standard, WAI-ARIA, and other specifications — catching errors that
									browsers silently ignore but assistive technologies and search engines may not.
								</>
							),
						},
						{
							title: 'On Your House Rules',
							symbol: '🛡',
							description: (
								<>
									Enforce your project's coding standards beyond what specs require. Configure rules
									for accessibility, security, performance, and naming conventions — making your
									team's agreements machine-checkable.
								</>
							),
						},
						{
							title: 'For Designed Structures',
							symbol: '📐',
							description: (
								<>
									Validate that components are used correctly within your design system. Markuplint
									checks attributes, properties, and parent-child relationships of elements — keeping
									your component contracts intact.
								</>
							),
						},
						{
							title: 'Applying by selector',
							symbol: '🆔',
							description: (
								<>
									Apply rules to specific elements using CSS Selectors, extended pseudo-classes, or
									Regular Expressions. Fine-tune which rules apply where — enforce strict rules in one
									section while relaxing them in another.
								</>
							),
						},
						{
							title: 'Beyond HTML',
							symbol: '📝',
							description: (
								<>
									Lint JSX (React), Vue, Svelte, Astro, Alpine.js, HTMX, Pug, PHP, Smarty, eRuby, EJS,
									Mustache/Handlebars, Nunjucks, Liquid, Markdown, MDX, and Tagged Template Literals
									(lit-html) — all through official parser plugins.
								</>
							),
						},
						{
							title: 'VS Code Extension',
							symbol: '🧩',
							description: (
								<>
									Get real-time feedback as you type with the Markuplint Extension for Visual Studio
									Code. No project setup required — install the extension, open an HTML file, and
									start linting immediately.
								</>
							),
						},
					]}
				/>
			</main>
		</Layout>
	);
}
