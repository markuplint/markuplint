//! Tokenizer states per WHATWG HTML spec §13.2.5.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum State {
    // §13.2.5.1
    Data,
    // §13.2.5.2
    RcData,
    // §13.2.5.3
    RawText,
    // §13.2.5.4
    ScriptData,
    // §13.2.5.5
    PlainText,
    // §13.2.5.6
    TagOpen,
    // §13.2.5.7
    EndTagOpen,
    // §13.2.5.8
    TagName,
    // §13.2.5.9
    RcDataLessThanSign,
    // §13.2.5.10
    RcDataEndTagOpen,
    // §13.2.5.11
    RcDataEndTagName,
    // §13.2.5.12
    RawTextLessThanSign,
    // §13.2.5.13
    RawTextEndTagOpen,
    // §13.2.5.14
    RawTextEndTagName,
    // §13.2.5.15
    ScriptDataLessThanSign,
    // §13.2.5.16
    ScriptDataEndTagOpen,
    // §13.2.5.17
    ScriptDataEndTagName,
    // §13.2.5.18
    ScriptDataEscapeStart,
    // §13.2.5.19
    ScriptDataEscapeStartDash,
    // §13.2.5.20
    ScriptDataEscaped,
    // §13.2.5.21
    ScriptDataEscapedDash,
    // §13.2.5.22
    ScriptDataEscapedDashDash,
    // §13.2.5.23
    ScriptDataEscapedLessThanSign,
    // §13.2.5.24
    ScriptDataEscapedEndTagOpen,
    // §13.2.5.25
    ScriptDataEscapedEndTagName,
    // §13.2.5.26
    ScriptDataDoubleEscapeStart,
    // §13.2.5.27
    ScriptDataDoubleEscaped,
    // §13.2.5.28
    ScriptDataDoubleEscapedDash,
    // §13.2.5.29
    ScriptDataDoubleEscapedDashDash,
    // §13.2.5.30
    ScriptDataDoubleEscapedLessThanSign,
    // §13.2.5.31
    ScriptDataDoubleEscapeEnd,
    // §13.2.5.32
    BeforeAttributeName,
    // §13.2.5.33
    AttributeName,
    // §13.2.5.34
    AfterAttributeName,
    // §13.2.5.35
    BeforeAttributeValue,
    // §13.2.5.36
    AttributeValueDoubleQuoted,
    // §13.2.5.37
    AttributeValueSingleQuoted,
    // §13.2.5.38
    AttributeValueUnquoted,
    // §13.2.5.39
    AfterAttributeValueQuoted,
    // §13.2.5.40
    SelfClosingStartTag,
    // §13.2.5.41
    BogusComment,
    // §13.2.5.42
    MarkupDeclarationOpen,
    // §13.2.5.43
    CommentStart,
    // §13.2.5.44
    CommentStartDash,
    // §13.2.5.45
    Comment,
    // §13.2.5.46
    CommentLessThanSign,
    // §13.2.5.47
    CommentLessThanSignBang,
    // §13.2.5.48
    CommentLessThanSignBangDash,
    // §13.2.5.49
    CommentLessThanSignBangDashDash,
    // §13.2.5.50
    CommentEndDash,
    // §13.2.5.51
    CommentEnd,
    // §13.2.5.52
    CommentEndBang,
    // §13.2.5.53
    Doctype,
    // §13.2.5.54
    BeforeDoctypeName,
    // §13.2.5.55
    DoctypeName,
    // §13.2.5.56
    AfterDoctypeName,
    // §13.2.5.57
    AfterDoctypePublicKeyword,
    // §13.2.5.58
    BeforeDoctypePublicIdentifier,
    // §13.2.5.59
    DoctypePublicIdentifierDoubleQuoted,
    // §13.2.5.60
    DoctypePublicIdentifierSingleQuoted,
    // §13.2.5.61
    AfterDoctypePublicIdentifier,
    // §13.2.5.62
    BetweenDoctypePublicAndSystemIdentifiers,
    // §13.2.5.63
    AfterDoctypeSystemKeyword,
    // §13.2.5.64
    BeforeDoctypeSystemIdentifier,
    // §13.2.5.65
    DoctypeSystemIdentifierDoubleQuoted,
    // §13.2.5.66
    DoctypeSystemIdentifierSingleQuoted,
    // §13.2.5.67
    AfterDoctypeSystemIdentifier,
    // §13.2.5.68
    BogusDoctype,
    // §13.2.5.69
    CDataSection,
    // §13.2.5.70
    CDataSectionBracket,
    // §13.2.5.71
    CDataSectionEnd,
    // §13.2.5.72
    CharacterReference,
    // §13.2.5.73
    NamedCharacterReference,
    // §13.2.5.74
    AmbiguousAmpersand,
    // §13.2.5.75
    NumericCharacterReference,
    // §13.2.5.76
    HexadecimalCharacterReferenceStart,
    // §13.2.5.77
    DecimalCharacterReferenceStart,
    // §13.2.5.78
    HexadecimalCharacterReference,
    // §13.2.5.79
    DecimalCharacterReference,
    // §13.2.5.80
    NumericCharacterReferenceEnd,
}
