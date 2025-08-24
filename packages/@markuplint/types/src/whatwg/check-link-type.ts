import type { CustomSyntaxChecker } from '../types.js';

import { checkList } from '../list.js';
import { TokenCollection } from '../token/token-collection.js';

type DefLinkTypeWhatwg = {
	readonly keyword: string;
	readonly link: string;
	readonly a: string;
	readonly form: string;
	readonly bodyOk: string;
};

type DefLinkTypeMicroformats = {
	readonly keyword: string;
	readonly link: boolean;
	readonly a: boolean;
};

type DefLinkTypeMicroformatsDropped = {
	readonly keyword: string;
};

/**
 * @see https://html.spec.whatwg.org/multipage/links.html#linkTypes
 *
 * Scraping:
 * ```js
 * JSON.stringify(document.querySelectorAll('#table-link-relations tbody tr').values().toArray().map((el) => {
 *     const keyword = el.querySelector('td').textContent.trim();
 *     const link = el.querySelector('td:nth-child(2)').textContent.trim();
 *     const a = el.querySelector('td[colspan="3"]:nth-child(2)')?.textContent.trim() ?? el.querySelector('td[colspan="2"]:nth-child(2)')?.textContent.trim() ?? el.querySelector('td:nth-child(3)')?.textContent.trim();
 *     const form = el.querySelector('td[colspan="3"]:nth-child(2)')?.textContent.trim() ?? el.querySelector('td[colspan="2"]:nth-child(3)')?.textContent.trim() ?? el.querySelector('td[colspan="2"]:nth-child(2) + td')?.textContent.trim() ?? el.querySelector('td:nth-child(4)')?.textContent.trim();
 *     const bodyOk = el.querySelector('td[colspan="3"]:nth-child(2) + td')?.textContent.trim() ?? el.querySelector('td[colspan="2"]:nth-child(3) + td')?.textContent.trim() ?? el.querySelector('td[colspan="2"]:nth-child(2) + td + td')?.textContent.trim() ?? el.querySelector('td:nth-child(5)')?.textContent.trim();
 *     return { keyword, link, a, form, bodyOk }
 * }));
 * ```
 */
const DEF_LINK_TYPE_WHATWG: DefLinkTypeWhatwg[] = [
	{ keyword: 'alternate', link: 'Hyperlink', a: 'Hyperlink', form: 'not allowed', bodyOk: '·' },
	{ keyword: 'canonical', link: 'Hyperlink', a: 'not allowed', form: 'not allowed', bodyOk: '·' },
	{ keyword: 'author', link: 'Hyperlink', a: 'Hyperlink', form: 'not allowed', bodyOk: '·' },
	{ keyword: 'bookmark', link: 'not allowed', a: 'Hyperlink', form: 'not allowed', bodyOk: '·' },
	{ keyword: 'dns-prefetch', link: 'External Resource', a: 'not allowed', form: 'not allowed', bodyOk: 'Yes' },
	{ keyword: 'expect', link: 'Internal Resource', a: 'not allowed', form: 'not allowed', bodyOk: '·' },
	{ keyword: 'external', link: 'not allowed', a: 'Annotation', form: 'Annotation', bodyOk: '·' },
	{ keyword: 'help', link: 'Hyperlink', a: 'Hyperlink', form: 'Hyperlink', bodyOk: '·' },
	{ keyword: 'icon', link: 'External Resource', a: 'not allowed', form: 'not allowed', bodyOk: '·' },
	{ keyword: 'manifest', link: 'External Resource', a: 'not allowed', form: 'not allowed', bodyOk: '·' },
	{ keyword: 'modulepreload', link: 'External Resource', a: 'not allowed', form: 'not allowed', bodyOk: 'Yes' },
	{ keyword: 'license', link: 'Hyperlink', a: 'Hyperlink', form: 'Hyperlink', bodyOk: '·' },
	{ keyword: 'next', link: 'Hyperlink', a: 'Hyperlink', form: 'Hyperlink', bodyOk: '·' },
	{ keyword: 'nofollow', link: 'not allowed', a: 'Annotation', form: 'Annotation', bodyOk: '·' },
	{ keyword: 'noopener', link: 'not allowed', a: 'Annotation', form: 'Annotation', bodyOk: '·' },
	{ keyword: 'noreferrer', link: 'not allowed', a: 'Annotation', form: 'Annotation', bodyOk: '·' },
	{ keyword: 'opener', link: 'not allowed', a: 'Annotation', form: 'Annotation', bodyOk: '·' },
	{ keyword: 'pingback', link: 'External Resource', a: 'not allowed', form: 'not allowed', bodyOk: 'Yes' },
	{ keyword: 'preconnect', link: 'External Resource', a: 'not allowed', form: 'not allowed', bodyOk: 'Yes' },
	{ keyword: 'prefetch', link: 'External Resource', a: 'not allowed', form: 'not allowed', bodyOk: 'Yes' },
	{ keyword: 'preload', link: 'External Resource', a: 'not allowed', form: 'not allowed', bodyOk: 'Yes' },
	{ keyword: 'prev', link: 'Hyperlink', a: 'Hyperlink', form: 'Hyperlink', bodyOk: '·' },
	{ keyword: 'privacy-policy', link: 'Hyperlink', a: 'Hyperlink', form: 'not allowed', bodyOk: '·' },
	{ keyword: 'search', link: 'Hyperlink', a: 'Hyperlink', form: 'Hyperlink', bodyOk: '·' },
	{ keyword: 'stylesheet', link: 'External Resource', a: 'not allowed', form: 'not allowed', bodyOk: 'Yes' },
	{ keyword: 'tag', link: 'not allowed', a: 'Hyperlink', form: 'not allowed', bodyOk: '·' },
	{ keyword: 'terms-of-service', link: 'Hyperlink', a: 'Hyperlink', form: 'not allowed', bodyOk: '·' },
];

/**
 * @see https://microformats.org/wiki/existing-rel-values#formats
 *
 * Scraping:
 * ```js
 * JSON.stringify($("h2:has('#formats') ~ table").eq(0).find('tr:has(td)').toArray().map((el) => {
 *     const $tr = $(el);
 *     const keyword = $tr.find('td')[0].textContent.trim();
 *     const link = !/not allow/i.test($tr.find('td')[1].textContent);
 *     const a = !/not allow/i.test($tr.find('td')[2].textContent);
 *     return { keyword, link, a }
 * }));
 * ```
 */
const DEF_LINK_TYPE_MICROFORMATS_FORMATS: DefLinkTypeMicroformats[] = [
	{ keyword: 'acquaintance', link: false, a: true },
	{ keyword: 'alternate', link: true, a: true },
	{ keyword: 'appendix', link: true, a: true },
	{ keyword: 'bookmark', link: false, a: true },
	{ keyword: 'chapter', link: true, a: true },
	{ keyword: 'child', link: true, a: true },
	{ keyword: 'colleague', link: false, a: true },
	{ keyword: 'contact', link: false, a: true },
	{ keyword: 'contents', link: true, a: true },
	{ keyword: 'copyright', link: true, a: true },
	{ keyword: 'co-resident', link: false, a: true },
	{ keyword: 'co-worker', link: false, a: true },
	{ keyword: 'crush', link: false, a: true },
	{ keyword: 'date', link: false, a: true },
	{ keyword: 'friend', link: false, a: true },
	{ keyword: 'glossary', link: true, a: true },
	{ keyword: 'help', link: true, a: true },
	{ keyword: 'its-rules', link: true, a: false },
	{ keyword: 'kin', link: false, a: true },
	{ keyword: 'license', link: true, a: true },
	{ keyword: 'me', link: true, a: true },
	{ keyword: 'met', link: false, a: true },
	{ keyword: 'muse', link: false, a: true },
	{ keyword: 'neighbor', link: false, a: true },
	{ keyword: 'next', link: true, a: true },
	{ keyword: 'nofollow', link: false, a: true },
	{ keyword: 'parent', link: true, a: true },
	{ keyword: 'prev', link: true, a: true },
	{ keyword: 'previous', link: true, a: true },
	{ keyword: 'section', link: true, a: true },
	{ keyword: 'sibling', link: false, a: true },
	{ keyword: 'spouse', link: false, a: true },
	{ keyword: 'start', link: true, a: true },
	{ keyword: 'stylesheet', link: true, a: false },
	{ keyword: 'subsection', link: true, a: true },
	{ keyword: 'sweetheart', link: false, a: true },
	{ keyword: 'tag', link: false, a: true },
	{ keyword: 'toc', link: true, a: true },
	{ keyword: 'transformation', link: true, a: true },
];

/**
 * @see https://microformats.org/wiki/existing-rel-values#proposals
 *
 * Scraping:
 * ```js
 * JSON.stringify($("h2:has('#proposals') ~ table").eq(0).find('tr:has(td)').toArray().map((el) => {
 *     const $tr = $(el);
 *     const keyword = $tr.find('td')[0].textContent.trim();
 *     return { keyword, link: true, a: true }
 * }));
 * ```
 */
const DEF_LINK_TYPE_MICROFORMATS_PROPOSALS: DefLinkTypeMicroformats[] = [
	{ keyword: 'pronunciation', link: true, a: true },
	{ keyword: 'directory', link: true, a: true },
	{ keyword: 'enclosure', link: true, a: true },
	{ keyword: 'home', link: true, a: true },
	{ keyword: 'payment', link: true, a: true },
	{ keyword: 'vcs-*', link: true, a: true },
];

/**
 * @see https://microformats.org/wiki/existing-rel-values#HTML5_link_type_extensions
 *
 * Scraping:
 * ```js
 * JSON.stringify($("h2:has('#HTML5_link_type_extensions') ~ table").eq(0).find('tr:has(td)').toArray().map((el) => {
 *     const $tr = $(el);
 *     const keyword = $tr.find('td')[0].textContent.trim();
 *     const link = !/not allow/i.test($tr.find('td')[1].textContent);
 *     const a = !/not allow/i.test($tr.find('td')[2].textContent);
 *     return { keyword, link, a }
 * }));
 * ```
 */
const DEF_LINK_TYPE_MICROFORMATS_HTML5_LINK_TYPE_EXTENSIONS: DefLinkTypeMicroformats[] = [
	{ keyword: 'about', link: true, a: true },
	{ keyword: 'amphtml', link: true, a: true },
	{ keyword: 'apple-touch-icon', link: true, a: false },
	{ keyword: 'apple-touch-icon-precomposed', link: true, a: false },
	{ keyword: 'apple-touch-startup-image', link: true, a: false },
	{ keyword: 'archived', link: true, a: true },
	{ keyword: 'attachment', link: true, a: true },
	{ keyword: 'authorization_endpoint', link: true, a: false },
	{ keyword: 'canonical', link: true, a: true },
	{ keyword: 'category', link: true, a: true },
	{ keyword: 'code-repository', link: true, a: true },
	{ keyword: 'code-license', link: true, a: true },
	{ keyword: 'component', link: true, a: false },
	{ keyword: 'chrome-webstore-item', link: true, a: false },
	{ keyword: 'content-repository', link: true, a: true },
	{ keyword: 'content-license', link: true, a: true },
	{ keyword: 'DCTERMS.conformsTo', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.contributor', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.creator', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.description', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.hasFormat', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.hasPart', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.hasVersion', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.isFormatOf', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.isPartOf', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.isReferencedBy', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.isReplacedBy', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.isRequiredBy', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.isVersionOf', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.license', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.mediator', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.publisher', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.references', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.relation', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.replaces', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.requires', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.rightsHolder', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.source', link: true, a: false }, // cspell:disable-line
	{ keyword: 'DCTERMS.subject', link: true, a: false }, // cspell:disable-line
	{ keyword: 'disclosure', link: false, a: true },
	{ keyword: 'discussion', link: true, a: true },
	{ keyword: 'donation', link: true, a: true },
	{ keyword: 'dns-prefetch', link: true, a: false },
	{ keyword: 'edit', link: true, a: true },
	{ keyword: 'EditURI', link: true, a: false },
	{ keyword: 'enclosure', link: true, a: true },
	{ keyword: 'entry-content', link: false, a: true },
	{ keyword: 'external', link: false, a: true },
	{ keyword: 'first', link: true, a: true },
	{ keyword: 'gbfs', link: true, a: false }, // cspell:disable-line
	{ keyword: 'gtfs-static', link: true, a: false }, // cspell:disable-line
	{ keyword: 'gtfs-realtime', link: true, a: false }, // cspell:disable-line
	{ keyword: 'home', link: true, a: true },
	{ keyword: 'hub', link: true, a: true },
	{ keyword: 'import', link: true, a: false },
	{ keyword: 'in-reply-to', link: true, a: true },
	{ keyword: 'root', link: true, a: true },
	{ keyword: 'index', link: true, a: true },
	{ keyword: 'issues', link: true, a: true },
	{ keyword: 'jslicense', link: true, a: true }, // cspell:disable-line
	{ keyword: 'last', link: true, a: true },
	{ keyword: 'lightbox', link: false, a: true },
	{ keyword: 'lightvideo', link: false, a: true },
	{ keyword: 'main', link: true, a: true },
	{ keyword: 'manifest', link: true, a: false },
	{ keyword: 'mask-icon', link: true, a: false },
	{ keyword: 'meta', link: true, a: false },
	{ keyword: 'micropub', link: true, a: false },
	{ keyword: 'noopener', link: false, a: true },
	{ keyword: 'openid.delegate', link: true, a: false },
	{ keyword: 'openid.server', link: true, a: false },
	{ keyword: 'openid2.local_id', link: true, a: false },
	{ keyword: 'openid2.provider', link: true, a: false },
	{ keyword: 'p3pv1', link: true, a: false },
	{ keyword: 'pgpkey', link: true, a: false },
	{ keyword: 'pingback', link: true, a: false },
	{ keyword: 'preconnect', link: true, a: false },
	{ keyword: 'prerender', link: true, a: true },
	{ keyword: 'profile', link: true, a: true },
	{ keyword: 'publisher', link: true, a: true },
	{ keyword: 'radioepg', link: true, a: true }, // cspell:disable-line
	{ keyword: 'rendition', link: true, a: true },
	{ keyword: 'reply-to', link: true, a: true },
	{ keyword: 'schema.DCTERMS', link: true, a: false }, // cspell:disable-line
	{ keyword: 'service', link: true, a: false },
	{ keyword: 'shortlink', link: true, a: false },
	{ keyword: 'sidebar', link: true, a: true },
	{ keyword: 'sitemap', link: true, a: false },
	{ keyword: 'subresource', link: true, a: false },
	{ keyword: 'sword', link: true, a: false },
	{ keyword: 'syndication', link: true, a: true },
	{ keyword: 'timesheet', link: true, a: false },
	{ keyword: 'token_endpoint', link: true, a: false },
	{ keyword: 'webmention', link: true, a: true },
	{ keyword: 'widget', link: true, a: true },
	{ keyword: 'wlwmanifest', link: true, a: false }, // cspell:disable-line
	{ keyword: 'image_src', link: true, a: false },
	{ keyword: 'http://docs.oasis-open.org/ns/cmis/link/200908/acl', link: true, a: true },
	{ keyword: 'stylesheet/less', link: true, a: false },
	{ keyword: 'yandex-tableau-widget', link: true, a: false },
];

/**
 * @see https://microformats.org/wiki/existing-rel-values#brainstorming
 *
 * Scraping:
 * ```js
 * JSON.stringify($("h2:has('#brainstorming') ~ table").eq(0).find('tr:has(td)').toArray().map((el) => {
 *     const $tr = $(el);
 *     const keyword = $tr.find('td')[0].textContent.trim();
 *     return { keyword, link: true, a: true }
 * }));
 * ```
 */
const DEF_LINK_TYPE_MICROFORMATS_BRAINSTORMING: DefLinkTypeMicroformats[] = [
	{ keyword: 'accessibility', link: true, a: true },
	{ keyword: 'author', link: true, a: true },
	{ keyword: 'bibliography', link: true, a: true },
	{ keyword: 'cite', link: true, a: true },
	{ keyword: 'embed', link: true, a: true },
	{ keyword: 'group', link: true, a: true },
	{ keyword: 'longdesc', link: true, a: true },
	{ keyword: 'map', link: true, a: true },
	{ keyword: 'member', link: true, a: true },
	{ keyword: 'm_PageScroll2id', link: true, a: true },
	{ keyword: 'prefetch', link: true, a: true },
	{ keyword: 'preload', link: true, a: true },
	{ keyword: 'prerender', link: true, a: true },
	{ keyword: 'profile', link: true, a: true },
	{ keyword: 'shortlink', link: true, a: true },
	{ keyword: 'source', link: true, a: true },
	{ keyword: 'vcalendar-parent', link: true, a: true }, // cspell:disable-line
	{ keyword: 'vcalendar-child', link: true, a: true }, // cspell:disable-line
	{ keyword: 'vcalendar-sibling', link: true, a: true }, // cspell:disable-line
	{ keyword: 'status', link: true, a: true },
	{ keyword: 'https://api.w.org/', link: true, a: true },
];

/**
 * @see https://microformats.org/wiki/existing-rel-values#POSH_usage
 *
 * Scraping:
 * ```js
 * JSON.stringify($("h2:has('#POSH_usage') ~ table").eq(0).find('tr:has(td)').toArray().map((el) => {
 *     const $tr = $(el);
 *     const keyword = $tr.find('td')[0].textContent.trim();
 *     return { keyword, link: true, a: true }
 * }));
 * ```
 */
const DEF_LINK_TYPE_MICROFORMATS_POSH_USAGE: DefLinkTypeMicroformats[] = [
	{ keyword: 'archive', link: true, a: true },
	{ keyword: 'archives', link: true, a: true },
	{ keyword: 'author', link: true, a: true },
	{ keyword: 'canonical', link: true, a: true },
	{ keyword: 'comment', link: true, a: true },
	{ keyword: 'contribution', link: true, a: true },
	{ keyword: 'EditURI', link: true, a: true },
	{ keyword: 'endorsed', link: true, a: true },
	{ keyword: 'fan', link: true, a: true },
	{ keyword: 'feed', link: true, a: true },
	{ keyword: 'footnote', link: true, a: true },
	{ keyword: 'icon', link: true, a: true },
	{ keyword: 'kinetic-stylesheet', link: true, a: true },
	{ keyword: 'lightbox', link: true, a: true },
	{ keyword: 'made', link: true, a: true },
	{ keyword: 'meta', link: true, a: true },
	{ keyword: 'microsummary', link: true, a: true },
	{ keyword: 'noreferrer', link: true, a: true },
	{ keyword: 'openid.delegate', link: true, a: true },
	{ keyword: 'openid.server', link: true, a: true },
	{ keyword: 'permalink', link: true, a: true },
	{ keyword: 'pgpkey', link: true, a: true },
	{ keyword: 'pingback', link: true, a: true },
	{ keyword: 'popover', link: true, a: true },
	{ keyword: 'prefetch', link: true, a: true },
	{ keyword: 'privacy', link: true, a: true },
	{ keyword: 'publickey', link: true, a: true },
	{ keyword: 'referral', link: true, a: true },
	{ keyword: 'related', link: true, a: true },
	{ keyword: 'replies', link: true, a: true },
	{ keyword: 'respond-proxy', link: true, a: true },
	{ keyword: 'respond-redirect', link: true, a: true },
	{ keyword: 'resource', link: true, a: true },
	{ keyword: 'search', link: true, a: true },
	{ keyword: 'sitemap', link: true, a: true },
	{ keyword: 'sponsor', link: true, a: true },
	{ keyword: 'tooltip', link: true, a: true },
	{ keyword: 'trackback', link: true, a: true },
	{ keyword: 'unendorsed', link: true, a: true },
	{ keyword: 'user', link: true, a: true },
	{ keyword: 'wlwmanifest', link: true, a: true }, // cspell:disable-line
];

/**
 * @see https://microformats.org/wiki/existing-rel-values#Dublin_Core
 *
 * > **only use invisible <link href> element.**
 *
 * Scraping:
 * ```js
 * JSON.stringify($("h2:has('#Dublin_Core') ~ table").eq(0).find('tr:has(td)').toArray().map((el) => {
 *     const $tr = $(el);
 *     const keyword = $tr.find('td')[0].textContent.trim();
 *     return { keyword, link: true, a: false }
 * }));
 */
const DEF_LINK_TYPE_MICROFORMATS_DUBLIN_CORE: DefLinkTypeMicroformats[] = [
	{ keyword: 'schema.DC', link: true, a: false },
	{ keyword: 'schema.DCTERMS', link: true, a: false }, // cspell:disable-line
];

/**
 * @see https://microformats.org/wiki/existing-rel-values#non_HTML_rel_values
 *
 * Scraping:
 * ```js
 * JSON.stringify($("h2:has('#non_HTML_rel_values') ~ table").eq(0).find('tr:has(td)').toArray().map((el) => {
 *     const $tr = $(el);
 *     const keyword = $tr.find('td')[0].textContent.trim();
 *     return { keyword, link: true, a: true }
 * }));
 */
const DEF_LINK_TYPE_MICROFORMATS_NON_HTML_REL_VALUES: DefLinkTypeMicroformatsDropped[] = [
	{ keyword: 'self' },
	{ keyword: 'http://gdata.youtube.com/schemas/2007#in-reply-to' },
	{ keyword: 'collection' },
	{ keyword: 'compensatingtx' }, // cspell:disable-line
	{ keyword: 'east' },
	{ keyword: 'events' },
	{ keyword: 'exit' },
	{ keyword: 'north' },
	{ keyword: 'south' },
	{ keyword: 'via' },
	{ keyword: 'west' },
	{ keyword: 'item' },
	{ keyword: 'create-form' },
	{ keyword: 'edit-form' },
	{ keyword: 'lightframe' },
	{ keyword: 'superbox[image]' },
	{ keyword: 'wp-video-lightbox' },
	{ keyword: 'youtube' },
	{ keyword: 'shadowbox' },
	{ keyword: 'permission' },
	{ keyword: 'sub' },
	{ keyword: 'unsub' }, // cspell:disable-line
	{ keyword: 'version-history' },
	{ keyword: 'latest-version' },
	{ keyword: 'working-copy' },
	{ keyword: 'working-copy-of' },
	{ keyword: 'predecessor-version' },
	{ keyword: 'successor-version' },
];

/**
 * @see https://microformats.org/wiki/existing-rel-values#dropped
 *
 * Scraping:
 * ```js
 * JSON.stringify($("h2:has('#dropped') ~ table").eq(0).find('tr:has(td)').toArray().map((el) => {
 *     const $tr = $(el);
 *     const keyword = $tr.find('td')[0].textContent.split(' ')[0]?.trim();
 *     return { keyword }
 * }));
 */
const DEF_LINK_TYPE_MICROFORMATS_DROPPED: DefLinkTypeMicroformatsDropped[] = [
	{ keyword: 'banner' },
	{ keyword: 'begin' },
	{ keyword: 'biblioentry' }, // cspell:disable-line
	{ keyword: 'bibliography' },
	{ keyword: 'child' },
	{ keyword: 'citation' },
	{ keyword: 'collection' },
	{ keyword: 'definition' },
	{ keyword: 'disclaimer' },
	{ keyword: 'editor' },
	{ keyword: 'end' },
	{ keyword: 'footnote' },
	{ keyword: 'navigate' },
	{ keyword: 'origin' },
	{ keyword: 'parent' },
	{ keyword: 'pointer' },
	{ keyword: 'publisher' },
	{ keyword: 'sibling' },
	{ keyword: 'top' },
	{ keyword: 'trademark' },
	{ keyword: 'translation' },
	{ keyword: 'urc' },
];

/**
 * @see https://microformats.org/wiki/existing-rel-values#dropped_without_prejudice
 *
 * Scraping:
 * ```js
 * JSON.stringify($("h2:has('#dropped_without_prejudice') ~ table").eq(0).find('tr:has(td)').toArray().map((el) => {
 *     const $tr = $(el);
 *     const keyword = $tr.find('td')[0].textContent.split(' ')[0]?.trim();
 *     return { keyword }
 * }));
 * ```
 */
const DEF_LINK_TYPE_MICROFORMATS_DROPPED_WITHOUT_PREJUDICE: DefLinkTypeMicroformatsDropped[] = [
	{ keyword: 'first' },
	{ keyword: 'index' },
	{ keyword: 'last' },
	{ keyword: 'up' },
];

/**
 * @see https://microformats.org/wiki/existing-rel-values#rejected
 *
 * Scraping:
 * ```js
 * JSON.stringify($("h2:has('#rejected') ~ table").eq(0).find('tr:has(td)').toArray().map((el) => {
 *     const $tr = $(el);
 *     const keyword = $tr.find('td')[0].textContent.split(' ')[0]?.trim();
 *     return { keyword }
 * }));
 * ```
 */
const DEF_LINK_TYPE_MICROFORMATS_REJECTED: DefLinkTypeMicroformatsDropped[] = [
	{ keyword: 'logo' },
	{ keyword: 'pavatar' }, // cspell:disable-line
];

const ALLOWED_LINK_TYPE_MICROFORMATS = [
	...DEF_LINK_TYPE_MICROFORMATS_FORMATS,
	...DEF_LINK_TYPE_MICROFORMATS_PROPOSALS,
	...DEF_LINK_TYPE_MICROFORMATS_HTML5_LINK_TYPE_EXTENSIONS,
	...DEF_LINK_TYPE_MICROFORMATS_BRAINSTORMING,
	...DEF_LINK_TYPE_MICROFORMATS_POSH_USAGE,
	...DEF_LINK_TYPE_MICROFORMATS_DUBLIN_CORE,
].filter(def => !DEF_LINK_TYPE_WHATWG.some(whatwg => whatwg.keyword === def.keyword));

/**
 * Link Type
 * @see https://html.spec.whatwg.org/multipage/links.html#linkTypes
 */
export const checkLinkType: CustomSyntaxChecker<{
	el: 'link' | 'body link' | 'a, area' | 'form';
}> = options => value => {
	if (!options) {
		throw new Error('options is required on `checkLinkType`');
	}

	const tokens = new TokenCollection(value, {
		separator: 'space',
		caseInsensitive: true,
		unique: true,
	});

	for (const def of DEF_LINK_TYPE_MICROFORMATS_NON_HTML_REL_VALUES) {
		const searched = tokens.search(def.keyword);
		if (searched) {
			return searched.unmatched({
				reason: 'unexpected-token',
				expects: [
					{
						type: 'common',
						value: 'valid Link Type',
					},
				],
			});
		}
	}

	for (const def of DEF_LINK_TYPE_MICROFORMATS_DROPPED) {
		const searched = tokens.search(def.keyword);
		if (searched) {
			return searched.unmatched({
				reason: 'unexpected-token',
				expects: [
					{
						type: 'common',
						value: 'valid Link Type',
					},
				],
			});
		}
	}

	for (const def of DEF_LINK_TYPE_MICROFORMATS_DROPPED_WITHOUT_PREJUDICE) {
		const searched = tokens.search(def.keyword);
		if (searched) {
			return searched.unmatched({
				reason: 'unexpected-token',
				expects: [
					{
						type: 'common',
						value: 'valid Link Type',
					},
				],
			});
		}
	}

	for (const def of DEF_LINK_TYPE_MICROFORMATS_REJECTED) {
		const searched = tokens.search(def.keyword);
		if (searched) {
			return searched.unmatched({
				reason: 'unexpected-token',
				expects: [
					{
						type: 'common',
						value: 'valid Link Type',
					},
				],
			});
		}
	}

	const enumList: string[] = [];

	for (const def of DEF_LINK_TYPE_WHATWG) {
		if (options.el === 'link' && def.link !== 'not allowed') {
			enumList.push(def.keyword);
		}
		if (options.el === 'body link' && def.link !== 'not allowed' && def.bodyOk === 'Yes') {
			enumList.push(def.keyword);
		}
		if (options.el === 'a, area' && def.a !== 'not allowed') {
			enumList.push(def.keyword);
		}
		if (options.el === 'form' && def.form !== 'not allowed') {
			enumList.push(def.keyword);
		}
	}

	for (const def of ALLOWED_LINK_TYPE_MICROFORMATS) {
		if (def.link && options.el === 'link') {
			enumList.push(def.keyword);
		}
		if (def.a && options.el === 'a, area') {
			enumList.push(def.keyword);
		}
	}

	if (enumList.length === 0) {
		throw new Error(`enumList is empty on \`checkLinkType\`, \`options\`: ${JSON.stringify(options)}`);
	}

	return checkList(
		value,
		{
			token: {
				enum: enumList as [string, ...string[]],
				caseInsensitive: true,
			},
			separator: 'space',
			caseInsensitive: true,
			unique: true,
			number: 'oneOrMore',
		},
		{},
		'https://html.spec.whatwg.org/multipage/links.html#linkTypes',
	);
};
