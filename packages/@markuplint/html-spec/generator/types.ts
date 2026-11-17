import type { ARIAProperty, ARIARoleInSchema } from '@markuplint/ml-spec';

/**
 * An ARIA role as the generator scrapes it: with the text of its definition in the W3C ARIA document.
 *
 * `isDeprecatedRole` reads the deprecation marker of the text, and the "Synonym" roles (`none`, `presentation`,
 * `image`, `img`) keep their own. The text is not part of `@markuplint/ml-spec`'s `ARIARoleInSchema`, because the data
 * carries none: `stripProse` drops it before the output is written.
 */
export type ScrapedARIARole = ARIARoleInSchema & {
	readonly description?: string;
};

/**
 * An ARIA property as the generator scrapes it: with the description of each of its values. It is dropped by
 * `stripProse` like the text of a role (see {@link ScrapedARIARole}).
 */
export type ScrapedARIAProperty = ARIAProperty & {
	readonly valueDescriptions?: Readonly<Record<string, string>>;
};
