import AttrDuplication from './attr-duplication';
import AttrEqualSpaceAfter from './attr-equal-space-after';
import AttrEqualSpaceBefore from './attr-equal-space-before';
import AttrSpacing from './attr-spacing';
import AttrValueQuotes from './attr-value-quotes';
import CaseSensitiveAttrName from './case-sensitive-attr-name';
import CaseSensitiveTagName from './case-sensitive-tag-name';
import CharacterReference from './character-reference';
import ClassNaming from './class-naming';
import DeprecatedAttr from './deprecated-attr';
import DeprecatedElement from './deprecated-element';
import Doctype from './doctype';
import IdDuplication from './id-duplication';
import Indentation from './indentation';
import IneffectiveAttr from './ineffective-attr';
import InvalidAttr from './invalid-attr';
import LandmarkRoles from './landmark-roles';
import NoBooleanAttrValue from './no-boolean-attr-value';
import NoDefaultValue from './no-default-value';
import NoHardCodeId from './no-hard-code-id';
import NoReferToNonExistentId from './no-refer-to-non-existent-id';
import NoUseEventHandlerAttr from './no-use-event-handler-attr';
import PermittedContents from './permitted-contents';
import RequiredAttr from './required-attr';
import RequiredElement from './required-element';
import RequiredH1 from './required-h1';
import WaiAria from './wai-aria';

export default {
	'attr-duplication': AttrDuplication,
	'attr-equal-space-after': AttrEqualSpaceAfter,
	'attr-equal-space-before': AttrEqualSpaceBefore,
	'attr-spacing': AttrSpacing,
	'attr-value-quotes': AttrValueQuotes,
	'case-sensitive-attr-name': CaseSensitiveAttrName,
	'case-sensitive-tag-name': CaseSensitiveTagName,
	'character-reference': CharacterReference,
	'class-naming': ClassNaming,
	'deprecated-attr': DeprecatedAttr,
	'deprecated-element': DeprecatedElement,
	doctype: Doctype,
	'id-duplication': IdDuplication,
	indentation: Indentation,
	'ineffective-attr': IneffectiveAttr,
	'invalid-attr': InvalidAttr,
	'landmark-roles': LandmarkRoles,
	'no-boolean-attr-value': NoBooleanAttrValue,
	'no-default-value': NoDefaultValue,
	'no-hard-code-id': NoHardCodeId,
	'no-refer-to-non-existent-id': NoReferToNonExistentId,
	'no-use-event-handler-attr': NoUseEventHandlerAttr,
	'permitted-contents': PermittedContents,
	'required-attr': RequiredAttr,
	'required-element': RequiredElement,
	'required-h1': RequiredH1,
	'wai-aria': WaiAria,
};
