/**
 * @module @markuplint/rules
 *
 * Built-in rules for markuplint. This module exports a registry of all
 * core lint rules that ship with markuplint, keyed by their rule name.
 * Each rule implements the {@link AnyRuleSeed} interface and covers
 * areas such as accessibility, HTML validity, naming conventions, and coding style.
 */

import type { AnyRuleSeed } from '@markuplint/ml-core';

export { ruleAliasTable } from './rule-aliases.js';

import AriaPropRequiresRole from './aria-prop-requires-role/index.js';
import AttrOrder from './attr-order/index.js';
import AttrValueQuotes from './attr-value-quotes/index.js';
import CaseSensitiveAttrName from './case-sensitive-attr-name/index.js';
import CaseSensitiveTagName from './case-sensitive-tag-name/index.js';
import CharacterReference from './character-reference/index.js';
import ClassNaming from './class-naming/index.js';
import FormAttrReferencesForm from './form-attr-references-form/index.js';
import HeadElementOrder from './head-element-order/index.js';
import InputButtonNonEmptyValue from './input-button-non-empty-value/index.js';
import InputListReferencesDatalist from './input-list-references-datalist/index.js';
import ItempropRequiresItemscope from './itemprop-requires-itemscope/index.js';
import LabelForReferencesLabelable from './label-for-references-labelable/index.js';
import LabelHasControl from './label-has-control/index.js';
import LabelNoMultipleControls from './label-no-multiple-controls/index.js';
import LandmarkRoles from './landmark-roles/index.js';
import LinkTypes from './link-types/index.js';
import MapIdNameMatch from './map-id-name-match/index.js';
import MetaCharsetPosition from './meta-charset-position/index.js';
import MeterValueBounds from './meter-value-bounds/index.js';
import NoAbstractRole from './no-abstract-role/index.js';
import NoAmbiguousNavigableTargetNames from './no-ambiguous-navigable-target-names/index.js';
import NoAriaOnPresentationalChildren from './no-aria-on-presentational-children/index.js';
import NoBooleanAttrValue from './no-boolean-attr-value/index.js';
import NoConsecutiveBr from './no-consecutive-br/index.js';
import NoContentAfterBody from './no-content-after-body/index.js';
import NoDefaultAriaValue from './no-default-aria-value/index.js';
import NoDefaultValue from './no-default-value/index.js';
import NoDeprecatedAriaProp from './no-deprecated-aria-prop/index.js';
import NoDeprecatedAttr from './no-deprecated-attr/index.js';
import NoDeprecatedElement from './no-deprecated-element/index.js';
import NoDeprecatedRole from './no-deprecated-role/index.js';
import NoDisallowedAttr from './no-disallowed-attr/index.js';
import NoDuplicateAttr from './no-duplicate-attr/index.js';
import NoDuplicateAutofocus from './no-duplicate-autofocus/index.js';
import NoDuplicateDt from './no-duplicate-dt/index.js';
import NoDuplicateId from './no-duplicate-id/index.js';
import NoDuplicateVisibleMain from './no-duplicate-visible-main/index.js';
import NoEmptyPalpableContent from './no-empty-palpable-content/index.js';
import NoEventHandlerAttr from './no-event-handler-attr/index.js';
import NoExtraSelectedOptions from './no-extra-selected-options/index.js';
import NoFocusableInAriaHidden from './no-focusable-in-aria-hidden/index.js';
import NoHardcodedId from './no-hardcoded-id/index.js';
import NoIneffectiveAttr from './no-ineffective-attr/index.js';
import NoInputFileValue from './no-input-file-value/index.js';
import NoInvalidAriaPropValue from './no-invalid-aria-prop-value/index.js';
import NoInvalidAttrValue from './no-invalid-attr-value/index.js';
import NoMismatchedAspectRatio from './no-mismatched-aspect-ratio/index.js';
import NoObsoleteAttr from './no-obsolete-attr/index.js';
import NoObsoleteDoctype from './no-obsolete-doctype/index.js';
import NoObsoleteElement from './no-obsolete-element/index.js';
import NoOrphanedEndTag from './no-orphaned-end-tag/index.js';
import NoPseudoList from './no-pseudo-list/index.js';
import NoRedundantAccessibleName from './no-redundant-accessible-name/index.js';
import NoRedundantRole from './no-redundant-role/index.js';
import NoReferToNonExistentId from './no-refer-to-non-existent-id/index.js';
import NoRestrictedAttr from './no-restricted-attr/index.js';
import NoRestrictedElement from './no-restricted-element/index.js';
import NoSkippedHeadingLevel from './no-skipped-heading-level/index.js';
import NoStrayHeadOrBodyTag from './no-stray-head-or-body-tag/index.js';
import NoUnclosedElementAtEof from './no-unclosed-element-at-eof/index.js';
import NoUnknownAttr from './no-unknown-attr/index.js';
import NoUnknownRole from './no-unknown-role/index.js';
import NoUnsupportedFeatures from './no-unsupported-features/index.js';
import PermittedContents from './permitted-contents/index.js';
import PermittedRoles from './permitted-roles/index.js';
import PlaceholderLabelOption from './placeholder-label-option/index.js';
import ProgressValueBounds from './progress-value-bounds/index.js';
import RequireAccessibleName from './require-accessible-name/index.js';
import RequireAdjacentPopover from './require-adjacent-popover/index.js';
import RequireAriaProp from './require-aria-prop/index.js';
import RequireAttr from './require-attr/index.js';
import RequireDatetime from './require-datetime/index.js';
import RequireDialogAutofocus from './require-dialog-autofocus/index.js';
import RequireDoctype from './require-doctype/index.js';
import RequireElement from './require-element/index.js';
import RequireEndTag from './require-end-tag/index.js';
import RequireOwnedElements from './require-owned-elements/index.js';
import RequireParentRole from './require-parent-role/index.js';
import RequiredH1 from './required-h1/index.js';
import ScriptContent from './script-content/index.js';
import SrcsetSizesConstraint from './srcset-sizes-constraint/index.js';
import TabRequiresTabpanel from './tab-requires-tabpanel/index.js';
import TableRowColumnAlignment from './table-row-column-alignment/index.js';
import UsemapReferencesMap from './usemap-references-map/index.js';
import WaiAria from './wai-aria/index.js';
import WaiAriaDisallowedProps from './wai-aria-disallowed-props/index.js';
import WaiAriaImplicitProps from './wai-aria-implicit-props/index.js';

/**
 * Registry of all built-in markuplint rules, mapping rule names to their seed definitions.
 * Used by the markuplint core to initialize rule instances during linting.
 */
const rules = {
	'aria-prop-requires-role': AriaPropRequiresRole,
	'attr-order': AttrOrder,
	'attr-value-quotes': AttrValueQuotes,
	'case-sensitive-attr-name': CaseSensitiveAttrName,
	'case-sensitive-tag-name': CaseSensitiveTagName,
	'character-reference': CharacterReference,
	'class-naming': ClassNaming,
	'form-attr-references-form': FormAttrReferencesForm,
	'head-element-order': HeadElementOrder,
	'input-button-non-empty-value': InputButtonNonEmptyValue,
	'input-list-references-datalist': InputListReferencesDatalist,
	'itemprop-requires-itemscope': ItempropRequiresItemscope,
	'label-for-references-labelable': LabelForReferencesLabelable,
	'label-has-control': LabelHasControl,
	'label-no-multiple-controls': LabelNoMultipleControls,
	'landmark-roles': LandmarkRoles,
	'link-types': LinkTypes,
	'map-id-name-match': MapIdNameMatch,
	'meta-charset-position': MetaCharsetPosition,
	'meter-value-bounds': MeterValueBounds,
	'no-abstract-role': NoAbstractRole,
	'no-ambiguous-navigable-target-names': NoAmbiguousNavigableTargetNames,
	'no-aria-on-presentational-children': NoAriaOnPresentationalChildren,
	'no-boolean-attr-value': NoBooleanAttrValue,
	'no-consecutive-br': NoConsecutiveBr,
	'no-content-after-body': NoContentAfterBody,
	'no-default-aria-value': NoDefaultAriaValue,
	'no-default-value': NoDefaultValue,
	'no-deprecated-aria-prop': NoDeprecatedAriaProp,
	'no-deprecated-attr': NoDeprecatedAttr,
	'no-deprecated-element': NoDeprecatedElement,
	'no-deprecated-role': NoDeprecatedRole,
	'no-disallowed-attr': NoDisallowedAttr,
	'no-duplicate-attr': NoDuplicateAttr,
	'no-duplicate-autofocus': NoDuplicateAutofocus,
	'no-duplicate-dt': NoDuplicateDt,
	'no-duplicate-id': NoDuplicateId,
	'no-duplicate-visible-main': NoDuplicateVisibleMain,
	'no-empty-palpable-content': NoEmptyPalpableContent,
	'no-event-handler-attr': NoEventHandlerAttr,
	'no-extra-selected-options': NoExtraSelectedOptions,
	'no-focusable-in-aria-hidden': NoFocusableInAriaHidden,
	'no-hardcoded-id': NoHardcodedId,
	'no-ineffective-attr': NoIneffectiveAttr,
	'no-input-file-value': NoInputFileValue,
	'no-invalid-aria-prop-value': NoInvalidAriaPropValue,
	'no-invalid-attr-value': NoInvalidAttrValue,
	'no-mismatched-aspect-ratio': NoMismatchedAspectRatio,
	'no-obsolete-attr': NoObsoleteAttr,
	'no-obsolete-doctype': NoObsoleteDoctype,
	'no-obsolete-element': NoObsoleteElement,
	'no-orphaned-end-tag': NoOrphanedEndTag,
	'no-pseudo-list': NoPseudoList,
	'no-redundant-accessible-name': NoRedundantAccessibleName,
	'no-redundant-role': NoRedundantRole,
	'no-refer-to-non-existent-id': NoReferToNonExistentId,
	'no-restricted-attr': NoRestrictedAttr,
	'no-restricted-element': NoRestrictedElement,
	'no-skipped-heading-level': NoSkippedHeadingLevel,
	'no-stray-head-or-body-tag': NoStrayHeadOrBodyTag,
	'no-unclosed-element-at-eof': NoUnclosedElementAtEof,
	'no-unknown-attr': NoUnknownAttr,
	'no-unknown-role': NoUnknownRole,
	'no-unsupported-features': NoUnsupportedFeatures,
	'permitted-contents': PermittedContents,
	'permitted-roles': PermittedRoles,
	'placeholder-label-option': PlaceholderLabelOption,
	'progress-value-bounds': ProgressValueBounds,
	'require-accessible-name': RequireAccessibleName,
	'require-adjacent-popover': RequireAdjacentPopover,
	'require-aria-prop': RequireAriaProp,
	'require-attr': RequireAttr,
	'require-datetime': RequireDatetime,
	'require-dialog-autofocus': RequireDialogAutofocus,
	'require-doctype': RequireDoctype,
	'require-element': RequireElement,
	'require-end-tag': RequireEndTag,
	'require-owned-elements': RequireOwnedElements,
	'require-parent-role': RequireParentRole,
	'required-h1': RequiredH1,
	'script-content': ScriptContent,
	'srcset-sizes-constraint': SrcsetSizesConstraint,
	'tab-requires-tabpanel': TabRequiresTabpanel,
	'table-row-column-alignment': TableRowColumnAlignment,
	'usemap-references-map': UsemapReferencesMap,
	'wai-aria': WaiAria,
	'wai-aria-disallowed-props': WaiAriaDisallowedProps,
	'wai-aria-implicit-props': WaiAriaImplicitProps,
} as const satisfies Record<string, AnyRuleSeed<any, any>>;

export default rules;
