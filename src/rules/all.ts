import CustomRule from '../rule/custom-rule';
import asyncAttrInScript from './markuplint-rule-async-attr-in-script';
import attrDuplication from './markuplint-rule-attr-duplication';
import attrEqualSpaceAfter from './markuplint-rule-attr-equal-space-after';
import attrEqualSpaceBefore from './markuplint-rule-attr-equal-space-before';
import attrSpasing from './markuplint-rule-attr-spasing';
import attrValueQuotes from './markuplint-rule-attr-value-quotes';
import caseSensitiveAttrName from './markuplint-rule-case-sensitive-attr-name';
import caseSensitiveTagName from './markuplint-rule-case-sensitive-tag-name';
import characterReference from './markuplint-rule-character-reference';
import classNaming from './markuplint-rule-class-naming';
import comment from './markuplint-rule-comment';
import commentSpasing from './markuplint-rule-comment-spasing';
import customElementNaming from './markuplint-rule-custom-element-naming';
import dataAttrNaming from './markuplint-rule-data-attr-naming';
import denyElement from './markuplint-rule-deny-element';
import deprecatedAriaAttr from './markuplint-rule-deprecated-aria-attr';
import deprecatedAttr from './markuplint-rule-deprecated-attr';
import deprecatedElement from './markuplint-rule-deprecated-element';
import deprecatedGlobalAttr from './markuplint-rule-deprecated-global-attr';
import doctype from './markuplint-rule-doctype';
import emptyAltAttr from './markuplint-rule-empty-alt-attr';
import eventAttr from './markuplint-rule-event-attr';
import externalLink from './markuplint-rule-external-link';
import headingInSectioningContent from './markuplint-rule-heading-in-sectioning-content';
import headingInSectioningRoot from './markuplint-rule-heading-in-sectioning-root';
import headingLevelsSkipping from './markuplint-rule-heading-levels-skipping';
import idDuplication from './markuplint-rule-id-duplication';
import indentation, { IndentationOptions } from './markuplint-rule-indentation';
import indentationAttr from './markuplint-rule-indentation-attr';
import labels from './markuplint-rule-labels';
import landmarkRoles from './markuplint-rule-landmark-roles';
import multilineAttr from './markuplint-rule-multiline-attr';
import multilineTag from './markuplint-rule-multiline-tag';
import omittedClosingTag from './markuplint-rule-omitted-closing-tag';
import parseError from './markuplint-rule-parse-error';
import path from './markuplint-rule-path';
import permittedContents from './markuplint-rule-permitted-contents';
import permittedRole from './markuplint-rule-permitted-role';
import requiredAttr from './markuplint-rule-required-attr';
import requiredElement from './markuplint-rule-required-element';
import requiredH1, { RequiredH1Options } from './markuplint-rule-required-h1';
import roleStructureTab from './markuplint-rule-role-structure-tab';
import selfClosingTag from './markuplint-rule-self-closing-tag';
import voidElementClosing from './markuplint-rule-void-element-closing';

export default [
	asyncAttrInScript,
	attrDuplication,
	attrEqualSpaceAfter,
	attrEqualSpaceBefore,
	attrSpasing,
	attrValueQuotes,
	caseSensitiveAttrName,
	caseSensitiveTagName,
	characterReference,
	classNaming,
	comment,
	commentSpasing,
	customElementNaming,
	dataAttrNaming,
	denyElement,
	deprecatedAriaAttr,
	deprecatedAttr,
	deprecatedElement,
	deprecatedGlobalAttr,
	doctype,
	emptyAltAttr,
	eventAttr,
	externalLink,
	headingInSectioningContent,
	headingInSectioningRoot,
	headingLevelsSkipping,
	idDuplication,
	indentation,
	indentationAttr,
	labels,
	landmarkRoles,
	multilineAttr,
	multilineTag,
	omittedClosingTag,
	parseError,
	path,
	permittedContents,
	permittedRole,
	requiredAttr,
	requiredElement,
	requiredH1,
	roleStructureTab,
	selfClosingTag,
	voidElementClosing,
];
