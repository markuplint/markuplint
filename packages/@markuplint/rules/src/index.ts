import type { AnyRuleSeed } from '@markuplint/ml-core';

import AttrDuplication from './attr-duplication';
import AttrValueQuotes from './attr-value-quotes';
import CaseSensitiveAttrName from './case-sensitive-attr-name';
import CaseSensitiveTagName from './case-sensitive-tag-name';
import CharacterReference from './character-reference';
import ClassNaming from './class-naming';
import DeprecatedAttr from './deprecated-attr';
import DeprecatedElement from './deprecated-element';
import DisallowedElement from './disallowed-element';
import Doctype from './doctype';
import EndTag from './end-tag';
import IdDuplication from './id-duplication';
import IneffectiveAttr from './ineffective-attr';
import InvalidAttr from './invalid-attr';
import LabelHasControl from './label-has-control';
import LandmarkRoles from './landmark-roles';
import NoBooleanAttrValue from './no-boolean-attr-value';
import NoDefaultValue from './no-default-value';
import NoEmptyPalpableContent from './no-empty-palpable-content';
import NoHardCodeId from './no-hard-code-id';
import NoReferToNonExistentId from './no-refer-to-non-existent-id';
import NoUseEventHandlerAttr from './no-use-event-handler-attr';
import PermittedContents from './permitted-contents';
import RequireAccessibleName from './require-accessible-name';
import RequiredAttr from './required-attr';
import RequiredElement from './required-element';
import RequiredH1 from './required-h1';
import UseList from './use-list';
import WaiAria from './wai-aria';

export default {
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
	'id-duplication': IdDuplication,
	'ineffective-attr': IneffectiveAttr,
	'invalid-attr': InvalidAttr,
	'label-has-control': LabelHasControl,
	'landmark-roles': LandmarkRoles,
	'no-boolean-attr-value': NoBooleanAttrValue,
	'no-default-value': NoDefaultValue,
	'no-empty-palpable-content': NoEmptyPalpableContent,
	'no-hard-code-id': NoHardCodeId,
	'no-refer-to-non-existent-id': NoReferToNonExistentId,
	'no-use-event-handler-attr': NoUseEventHandlerAttr,
	'permitted-contents': PermittedContents,
	'require-accessible-name': RequireAccessibleName,
	'required-attr': RequiredAttr,
	'required-element': RequiredElement,
	'required-h1': RequiredH1,
	'use-list': UseList,
	'wai-aria': WaiAria,
} as Record<string, AnyRuleSeed>;
