import type { AnyRuleSeed } from '@markuplint/ml-core';

import AttrDuplication from './attr-duplication/index.js';
import AttrValueQuotes from './attr-value-quotes/index.js';
import CaseSensitiveAttrName from './case-sensitive-attr-name/index.js';
import CaseSensitiveTagName from './case-sensitive-tag-name/index.js';
import CharacterReference from './character-reference/index.js';
import ClassNaming from './class-naming/index.js';
import DeprecatedAttr from './deprecated-attr/index.js';
import DeprecatedElement from './deprecated-element/index.js';
import DisallowedElement from './disallowed-element/index.js';
import Doctype from './doctype/index.js';
import EndTag from './end-tag/index.js';
import HeadingLevels from './heading-levels/index.js';
import IdDuplication from './id-duplication/index.js';
import IneffectiveAttr from './ineffective-attr/index.js';
import InvalidAttr from './invalid-attr/index.js';
import LabelHasControl from './label-has-control/index.js';
import LandmarkRoles from './landmark-roles/index.js';
import NeighborPopovers from './neighbor-popovers/index.js';
import NoBooleanAttrValue from './no-boolean-attr-value/index.js';
import NoConsecutiveBr from './no-consecutive-br/index.js';
import NoDefaultValue from './no-default-value/index.js';
import NoDuplicateDt from './no-duplicate-dt/index.js';
import NoEmptyPalpableContent from './no-empty-palpable-content/index.js';
import NoHardCodeId from './no-hard-code-id/index.js';
import NoOrphanedEndTag from './no-orphaned-end-tag/index.js';
import NoReferToNonExistentId from './no-refer-to-non-existent-id/index.js';
import NoUseEventHandlerAttr from './no-use-event-handler-attr/index.js';
import PermittedContents from './permitted-contents/index.js';
import PlaceholderLabelOption from './placeholder-label-option/index.js';
import RequireAccessibleName from './require-accessible-name/index.js';
import RequireDatetime from './require-datetime/index.js';
import RequiredAttr from './required-attr/index.js';
import RequiredElement from './required-element/index.js';
import RequiredH1 from './required-h1/index.js';
import UseList from './use-list/index.js';
import WaiAria from './wai-aria/index.js';

const rules = {
	'attr-duplication': AttrDuplication,
	'attr-value-quotes': AttrValueQuotes,
	'case-sensitive-attr-name': CaseSensitiveAttrName,
	'case-sensitive-tag-name': CaseSensitiveTagName,
	'character-reference': CharacterReference,
	'class-naming': ClassNaming,
	'deprecated-attr': DeprecatedAttr,
	'deprecated-element': DeprecatedElement,
	'disallowed-element': DisallowedElement,
	doctype: Doctype,
	'end-tag': EndTag,
	'heading-levels': HeadingLevels,
	'id-duplication': IdDuplication,
	'ineffective-attr': IneffectiveAttr,
	'invalid-attr': InvalidAttr,
	'label-has-control': LabelHasControl,
	'landmark-roles': LandmarkRoles,
	'neighbor-popovers': NeighborPopovers,
	'no-boolean-attr-value': NoBooleanAttrValue,
	'no-consecutive-br': NoConsecutiveBr,
	'no-default-value': NoDefaultValue,
	'no-duplicate-dt': NoDuplicateDt,
	'no-empty-palpable-content': NoEmptyPalpableContent,
	'no-hard-code-id': NoHardCodeId,
	'no-orphaned-end-tag': NoOrphanedEndTag,
	'no-refer-to-non-existent-id': NoReferToNonExistentId,
	'no-use-event-handler-attr': NoUseEventHandlerAttr,
	'permitted-contents': PermittedContents,
	'placeholder-label-option': PlaceholderLabelOption,
	'require-accessible-name': RequireAccessibleName,
	'require-datetime': RequireDatetime,
	'required-attr': RequiredAttr,
	'required-element': RequiredElement,
	'required-h1': RequiredH1,
	'use-list': UseList,
	'wai-aria': WaiAria,
} as const satisfies Record<string, AnyRuleSeed<any, any>>;

export default rules;
