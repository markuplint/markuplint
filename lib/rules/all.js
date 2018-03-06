"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const markuplint_rule_async_attr_in_script_1 = __importDefault(require("./markuplint-rule-async-attr-in-script"));
const markuplint_rule_attr_duplication_1 = __importDefault(require("./markuplint-rule-attr-duplication"));
const markuplint_rule_attr_equal_space_after_1 = __importDefault(require("./markuplint-rule-attr-equal-space-after"));
const markuplint_rule_attr_equal_space_before_1 = __importDefault(require("./markuplint-rule-attr-equal-space-before"));
const markuplint_rule_attr_spasing_1 = __importDefault(require("./markuplint-rule-attr-spasing"));
const markuplint_rule_attr_value_quotes_1 = __importDefault(require("./markuplint-rule-attr-value-quotes"));
const markuplint_rule_case_sensitive_attr_name_1 = __importDefault(require("./markuplint-rule-case-sensitive-attr-name"));
const markuplint_rule_case_sensitive_tag_name_1 = __importDefault(require("./markuplint-rule-case-sensitive-tag-name"));
const markuplint_rule_character_reference_1 = __importDefault(require("./markuplint-rule-character-reference"));
const markuplint_rule_class_naming_1 = __importDefault(require("./markuplint-rule-class-naming"));
const markuplint_rule_comment_1 = __importDefault(require("./markuplint-rule-comment"));
const markuplint_rule_comment_spasing_1 = __importDefault(require("./markuplint-rule-comment-spasing"));
const markuplint_rule_custom_element_naming_1 = __importDefault(require("./markuplint-rule-custom-element-naming"));
const markuplint_rule_data_attr_naming_1 = __importDefault(require("./markuplint-rule-data-attr-naming"));
const markuplint_rule_deny_element_1 = __importDefault(require("./markuplint-rule-deny-element"));
const markuplint_rule_deprecated_aria_attr_1 = __importDefault(require("./markuplint-rule-deprecated-aria-attr"));
const markuplint_rule_deprecated_attr_1 = __importDefault(require("./markuplint-rule-deprecated-attr"));
const markuplint_rule_deprecated_element_1 = __importDefault(require("./markuplint-rule-deprecated-element"));
const markuplint_rule_deprecated_global_attr_1 = __importDefault(require("./markuplint-rule-deprecated-global-attr"));
const markuplint_rule_doctype_1 = __importDefault(require("./markuplint-rule-doctype"));
const markuplint_rule_empty_alt_attr_1 = __importDefault(require("./markuplint-rule-empty-alt-attr"));
const markuplint_rule_event_attr_1 = __importDefault(require("./markuplint-rule-event-attr"));
const markuplint_rule_external_link_1 = __importDefault(require("./markuplint-rule-external-link"));
const markuplint_rule_heading_in_sectioning_content_1 = __importDefault(require("./markuplint-rule-heading-in-sectioning-content"));
const markuplint_rule_heading_in_sectioning_root_1 = __importDefault(require("./markuplint-rule-heading-in-sectioning-root"));
const markuplint_rule_heading_levels_skipping_1 = __importDefault(require("./markuplint-rule-heading-levels-skipping"));
const markuplint_rule_id_duplication_1 = __importDefault(require("./markuplint-rule-id-duplication"));
const markuplint_rule_indentation_1 = __importDefault(require("./markuplint-rule-indentation"));
const markuplint_rule_indentation_attr_1 = __importDefault(require("./markuplint-rule-indentation-attr"));
const markuplint_rule_labels_1 = __importDefault(require("./markuplint-rule-labels"));
const markuplint_rule_landmark_roles_1 = __importDefault(require("./markuplint-rule-landmark-roles"));
const markuplint_rule_multiline_attr_1 = __importDefault(require("./markuplint-rule-multiline-attr"));
const markuplint_rule_multiline_tag_1 = __importDefault(require("./markuplint-rule-multiline-tag"));
const markuplint_rule_omitted_closing_tag_1 = __importDefault(require("./markuplint-rule-omitted-closing-tag"));
const markuplint_rule_parse_error_1 = __importDefault(require("./markuplint-rule-parse-error"));
const markuplint_rule_path_1 = __importDefault(require("./markuplint-rule-path"));
const markuplint_rule_permitted_contents_1 = __importDefault(require("./markuplint-rule-permitted-contents"));
const markuplint_rule_permitted_role_1 = __importDefault(require("./markuplint-rule-permitted-role"));
const markuplint_rule_required_attr_1 = __importDefault(require("./markuplint-rule-required-attr"));
const markuplint_rule_required_element_1 = __importDefault(require("./markuplint-rule-required-element"));
const markuplint_rule_required_h1_1 = __importDefault(require("./markuplint-rule-required-h1"));
const markuplint_rule_role_structure_tab_1 = __importDefault(require("./markuplint-rule-role-structure-tab"));
const markuplint_rule_self_closing_tag_1 = __importDefault(require("./markuplint-rule-self-closing-tag"));
const markuplint_rule_void_element_closing_1 = __importDefault(require("./markuplint-rule-void-element-closing"));
exports.default = [
    markuplint_rule_async_attr_in_script_1.default,
    markuplint_rule_attr_duplication_1.default,
    markuplint_rule_attr_equal_space_after_1.default,
    markuplint_rule_attr_equal_space_before_1.default,
    markuplint_rule_attr_spasing_1.default,
    markuplint_rule_attr_value_quotes_1.default,
    markuplint_rule_case_sensitive_attr_name_1.default,
    markuplint_rule_case_sensitive_tag_name_1.default,
    markuplint_rule_character_reference_1.default,
    markuplint_rule_class_naming_1.default,
    markuplint_rule_comment_1.default,
    markuplint_rule_comment_spasing_1.default,
    markuplint_rule_custom_element_naming_1.default,
    markuplint_rule_data_attr_naming_1.default,
    markuplint_rule_deny_element_1.default,
    markuplint_rule_deprecated_aria_attr_1.default,
    markuplint_rule_deprecated_attr_1.default,
    markuplint_rule_deprecated_element_1.default,
    markuplint_rule_deprecated_global_attr_1.default,
    markuplint_rule_doctype_1.default,
    markuplint_rule_empty_alt_attr_1.default,
    markuplint_rule_event_attr_1.default,
    markuplint_rule_external_link_1.default,
    markuplint_rule_heading_in_sectioning_content_1.default,
    markuplint_rule_heading_in_sectioning_root_1.default,
    markuplint_rule_heading_levels_skipping_1.default,
    markuplint_rule_id_duplication_1.default,
    markuplint_rule_indentation_1.default,
    markuplint_rule_indentation_attr_1.default,
    markuplint_rule_labels_1.default,
    markuplint_rule_landmark_roles_1.default,
    markuplint_rule_multiline_attr_1.default,
    markuplint_rule_multiline_tag_1.default,
    markuplint_rule_omitted_closing_tag_1.default,
    markuplint_rule_parse_error_1.default,
    markuplint_rule_path_1.default,
    markuplint_rule_permitted_contents_1.default,
    markuplint_rule_permitted_role_1.default,
    markuplint_rule_required_attr_1.default,
    markuplint_rule_required_element_1.default,
    markuplint_rule_required_h1_1.default,
    markuplint_rule_role_structure_tab_1.default,
    markuplint_rule_self_closing_tag_1.default,
    markuplint_rule_void_element_closing_1.default,
];
