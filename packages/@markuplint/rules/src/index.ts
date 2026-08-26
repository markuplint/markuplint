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
import ClassNaming from './class-naming/index.js';
import ConsistentTableRowLength from './consistent-table-row-length/index.js';
import ElementSupportsAriaProp from './element-supports-aria-prop/index.js';
import FormAttrReferencesForm from './form-attr-references-form/index.js';
import HeadElementOrder from './head-element-order/index.js';
import InputButtonNonEmptyValue from './input-button-non-empty-value/index.js';
import InputListReferencesDatalist from './input-list-references-datalist/index.js';
import ItempropRequiresItemscope from './itemprop-requires-itemscope/index.js';
import LabelForReferencesLabelable from './label-for-references-labelable/index.js';
import LabelHasControl from './label-has-control/index.js';
import LabelNoMultipleControls from './label-no-multiple-controls/index.js';
import LinkTypes from './link-types/index.js';
import MapIdNameMatch from './map-id-name-match/index.js';
import MetaCharsetPosition from './meta-charset-position/index.js';
import MeterValueBounds from './meter-value-bounds/index.js';
import NoAbstractRole from './no-abstract-role/index.js';
import NoAlwaysMatchingSource from './no-always-matching-source/index.js';
import NoAmbiguousNavigableTargetNames from './no-ambiguous-navigable-target-names/index.js';
import NoAriaOnPresentationalChildren from './no-aria-on-presentational-children/index.js';
import NoBooleanAttrValue from './no-boolean-attr-value/index.js';
import NoBrokenFragmentLink from './no-broken-fragment-link/index.js';
import NoConsecutiveBr from './no-consecutive-br/index.js';
import NoContentAfterBody from './no-content-after-body/index.js';
import NoContradictoryAriaProp from './no-contradictory-aria-prop/index.js';
import NoDefaultAriaValue from './no-default-aria-value/index.js';
import NoDefaultValue from './no-default-value/index.js';
import NoDeprecatedAriaProp from './no-deprecated-aria-prop/index.js';
import NoDeprecatedAttr from './no-deprecated-attr/index.js';
import NoDeprecatedElement from './no-deprecated-element/index.js';
import NoDeprecatedRole from './no-deprecated-role/index.js';
import NoDisallowedAncestor from './no-disallowed-ancestor/index.js';
import NoDisallowedAttr from './no-disallowed-attr/index.js';
import NoDuplicateAttr from './no-duplicate-attr/index.js';
import NoDuplicateAutofocus from './no-duplicate-autofocus/index.js';
import NoDuplicateDt from './no-duplicate-dt/index.js';
import NoDuplicateId from './no-duplicate-id/index.js';
import NoDuplicateSiblingAttr from './no-duplicate-sibling-attr/index.js';
import NoDuplicateVisibleMain from './no-duplicate-visible-main/index.js';
import NoEmptyPalpableContent from './no-empty-palpable-content/index.js';
import NoEmptyTableTrack from './no-empty-table-track/index.js';
import NoEventHandlerAttr from './no-event-handler-attr/index.js';
import NoExtraSelectedOptions from './no-extra-selected-options/index.js';
import NoFocusableInAriaHidden from './no-focusable-in-aria-hidden/index.js';
import NoHardcodedId from './no-hardcoded-id/index.js';
import NoIneffectiveAttr from './no-ineffective-attr/index.js';
import NoInputFileValue from './no-input-file-value/index.js';
import NoInvalidAriaPropValue from './no-invalid-aria-prop-value/index.js';
import NoInvalidAttrValue from './no-invalid-attr-value/index.js';
import NoMalformedCharacterReference from './no-malformed-character-reference/index.js';
import NoMismatchedAspectRatio from './no-mismatched-aspect-ratio/index.js';
import NoMixedSrcsetDescriptors from './no-mixed-srcset-descriptors/index.js';
import NoNestedTopLevelLandmark from './no-nested-top-level-landmark/index.js';
import NoObsoleteAttr from './no-obsolete-attr/index.js';
import NoObsoleteDoctype from './no-obsolete-doctype/index.js';
import NoObsoleteElement from './no-obsolete-element/index.js';
import NoOrphanedEndTag from './no-orphaned-end-tag/index.js';
import NoProhibitedNaming from './no-prohibited-naming/index.js';
import NoPseudoList from './no-pseudo-list/index.js';
import NoRedundantAccessibleName from './no-redundant-accessible-name/index.js';
import NoRedundantAriaProp from './no-redundant-aria-prop/index.js';
import NoRedundantRole from './no-redundant-role/index.js';
import NoReferToNonExistentId from './no-refer-to-non-existent-id/index.js';
import NoRestrictedAttr from './no-restricted-attr/index.js';
import NoRestrictedElement from './no-restricted-element/index.js';
import NoSkippedHeadingLevel from './no-skipped-heading-level/index.js';
import NoStrayHeadOrBodyTag from './no-stray-head-or-body-tag/index.js';
import NoTableCellOverlap from './no-table-cell-overlap/index.js';
import NoTableSpanOverflow from './no-table-span-overflow/index.js';
import NoUnclosedElementAtEof from './no-unclosed-element-at-eof/index.js';
import NoUnescapedChar from './no-unescaped-char/index.js';
import NoUnknownAttr from './no-unknown-attr/index.js';
import NoUnknownRole from './no-unknown-role/index.js';
import NoUnpairedSrcsetSizes from './no-unpaired-srcset-sizes/index.js';
import NoUnsupportedFeatures from './no-unsupported-features/index.js';
import PermittedContents from './permitted-contents/index.js';
import PermittedRoles from './permitted-roles/index.js';
import PlaceholderLabelOption from './placeholder-label-option/index.js';
import ProgressValueBounds from './progress-value-bounds/index.js';
import RequireAccessibleName from './require-accessible-name/index.js';
import RequireAdjacentPopover from './require-adjacent-popover/index.js';
import RequireAncestor from './require-ancestor/index.js';
import RequireAriaProp from './require-aria-prop/index.js';
import RequireAttr from './require-attr/index.js';
import RequireDatetime from './require-datetime/index.js';
import RequireDialogAutofocus from './require-dialog-autofocus/index.js';
import RequireDoctype from './require-doctype/index.js';
import RequireElement from './require-element/index.js';
import RequireEndTag from './require-end-tag/index.js';
import RequireLandmarkLabel from './require-landmark-label/index.js';
import RequireOwnedElements from './require-owned-elements/index.js';
import RequireParentRole from './require-parent-role/index.js';
import RequiredH1 from './required-h1/index.js';
import RoleSupportsAriaProp from './role-supports-aria-prop/index.js';
import SizesAutoRequiresLazyLoading from './sizes-auto-requires-lazy-loading/index.js';
import TabRequiresTabpanel from './tab-requires-tabpanel/index.js';
import UsemapReferencesMap from './usemap-references-map/index.js';
import ValidImportmap from './valid-importmap/index.js';
import ValidSpeculationRules from './valid-speculation-rules/index.js';
import WaiAria from './wai-aria/index.js';

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
	'class-naming': ClassNaming,
	'consistent-table-row-length': ConsistentTableRowLength,
	'element-supports-aria-prop': ElementSupportsAriaProp,
	'form-attr-references-form': FormAttrReferencesForm,
	'head-element-order': HeadElementOrder,
	'input-button-non-empty-value': InputButtonNonEmptyValue,
	'input-list-references-datalist': InputListReferencesDatalist,
	'itemprop-requires-itemscope': ItempropRequiresItemscope,
	'label-for-references-labelable': LabelForReferencesLabelable,
	'label-has-control': LabelHasControl,
	'label-no-multiple-controls': LabelNoMultipleControls,
	'link-types': LinkTypes,
	'map-id-name-match': MapIdNameMatch,
	'meta-charset-position': MetaCharsetPosition,
	'meter-value-bounds': MeterValueBounds,
	'no-abstract-role': NoAbstractRole,
	'no-always-matching-source': NoAlwaysMatchingSource,
	'no-ambiguous-navigable-target-names': NoAmbiguousNavigableTargetNames,
	'no-aria-on-presentational-children': NoAriaOnPresentationalChildren,
	'no-boolean-attr-value': NoBooleanAttrValue,
	'no-broken-fragment-link': NoBrokenFragmentLink,
	'no-consecutive-br': NoConsecutiveBr,
	'no-content-after-body': NoContentAfterBody,
	'no-contradictory-aria-prop': NoContradictoryAriaProp,
	'no-default-aria-value': NoDefaultAriaValue,
	'no-default-value': NoDefaultValue,
	'no-deprecated-aria-prop': NoDeprecatedAriaProp,
	'no-deprecated-attr': NoDeprecatedAttr,
	'no-deprecated-element': NoDeprecatedElement,
	'no-deprecated-role': NoDeprecatedRole,
	'no-disallowed-ancestor': NoDisallowedAncestor,
	'no-disallowed-attr': NoDisallowedAttr,
	'no-duplicate-attr': NoDuplicateAttr,
	'no-duplicate-autofocus': NoDuplicateAutofocus,
	'no-duplicate-dt': NoDuplicateDt,
	'no-duplicate-id': NoDuplicateId,
	'no-duplicate-sibling-attr': NoDuplicateSiblingAttr,
	'no-duplicate-visible-main': NoDuplicateVisibleMain,
	'no-empty-palpable-content': NoEmptyPalpableContent,
	'no-empty-table-track': NoEmptyTableTrack,
	'no-event-handler-attr': NoEventHandlerAttr,
	'no-extra-selected-options': NoExtraSelectedOptions,
	'no-focusable-in-aria-hidden': NoFocusableInAriaHidden,
	'no-hardcoded-id': NoHardcodedId,
	'no-ineffective-attr': NoIneffectiveAttr,
	'no-input-file-value': NoInputFileValue,
	'no-invalid-aria-prop-value': NoInvalidAriaPropValue,
	'no-invalid-attr-value': NoInvalidAttrValue,
	'no-malformed-character-reference': NoMalformedCharacterReference,
	'no-mismatched-aspect-ratio': NoMismatchedAspectRatio,
	'no-mixed-srcset-descriptors': NoMixedSrcsetDescriptors,
	'no-nested-top-level-landmark': NoNestedTopLevelLandmark,
	'no-obsolete-attr': NoObsoleteAttr,
	'no-obsolete-doctype': NoObsoleteDoctype,
	'no-obsolete-element': NoObsoleteElement,
	'no-orphaned-end-tag': NoOrphanedEndTag,
	'no-prohibited-naming': NoProhibitedNaming,
	'no-pseudo-list': NoPseudoList,
	'no-redundant-accessible-name': NoRedundantAccessibleName,
	'no-redundant-aria-prop': NoRedundantAriaProp,
	'no-redundant-role': NoRedundantRole,
	'no-refer-to-non-existent-id': NoReferToNonExistentId,
	'no-restricted-attr': NoRestrictedAttr,
	'no-restricted-element': NoRestrictedElement,
	'no-skipped-heading-level': NoSkippedHeadingLevel,
	'no-stray-head-or-body-tag': NoStrayHeadOrBodyTag,
	'no-table-cell-overlap': NoTableCellOverlap,
	'no-table-span-overflow': NoTableSpanOverflow,
	'no-unclosed-element-at-eof': NoUnclosedElementAtEof,
	'no-unescaped-char': NoUnescapedChar,
	'no-unknown-attr': NoUnknownAttr,
	'no-unknown-role': NoUnknownRole,
	'no-unpaired-srcset-sizes': NoUnpairedSrcsetSizes,
	'no-unsupported-features': NoUnsupportedFeatures,
	'permitted-contents': PermittedContents,
	'permitted-roles': PermittedRoles,
	'placeholder-label-option': PlaceholderLabelOption,
	'progress-value-bounds': ProgressValueBounds,
	'require-accessible-name': RequireAccessibleName,
	'require-adjacent-popover': RequireAdjacentPopover,
	'require-ancestor': RequireAncestor,
	'require-aria-prop': RequireAriaProp,
	'require-attr': RequireAttr,
	'require-datetime': RequireDatetime,
	'require-dialog-autofocus': RequireDialogAutofocus,
	'require-doctype': RequireDoctype,
	'require-element': RequireElement,
	'require-end-tag': RequireEndTag,
	'require-landmark-label': RequireLandmarkLabel,
	'require-owned-elements': RequireOwnedElements,
	'require-parent-role': RequireParentRole,
	'required-h1': RequiredH1,
	'role-supports-aria-prop': RoleSupportsAriaProp,
	'sizes-auto-requires-lazy-loading': SizesAutoRequiresLazyLoading,
	'tab-requires-tabpanel': TabRequiresTabpanel,
	'usemap-references-map': UsemapReferencesMap,
	'valid-importmap': ValidImportmap,
	'valid-speculation-rules': ValidSpeculationRules,
	'wai-aria': WaiAria,
} as const satisfies Record<string, AnyRuleSeed<any, any>>;

export default rules;
