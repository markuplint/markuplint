import type { FormattedPrimitiveTypeCreator } from '../types.js';

import { isNavigableTargetName } from './is-navigable-target-name.js';

/**
 * Deprecated alias of {@link isNavigableTargetName}: the HTML Standard replaced
 * the valid browsing context name with the valid navigable target name.
 *
 * @see https://html.spec.whatwg.org/multipage/document-sequences.html#navigable-target-names
 *
 * @deprecated Use {@link isNavigableTargetName} instead.
 */
export const isBrowserContextName: FormattedPrimitiveTypeCreator = isNavigableTargetName;
