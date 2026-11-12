//! Port of `packages/@markuplint/types/src/whatwg/check-datetime/`: the date and time
//! microsyntaxes.
//!
//! Each checker splits the value into tokens with the same patterns TS uses and checks them with
//! [`TokenCollection::each_check`], so a mismatch carries the token, reason, part name and pass
//! count TS reports. The JS regular expressions are rewritten for the `regex` crate with JS
//! semantics: `.` excludes all four JS line terminators, `\d`/`\D` are ASCII, and `\s` is the JS
//! white-space set.
//!
//! The year and month a date is checked against are the state of one check (TS keeps them on the
//! `TokenCollection` the callbacks are called with), so a yearless date is checked against a leap
//! year.
//!
//! @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates-and-times>

use std::cell::{Cell, RefCell};
use std::sync::LazyLock;

use regex::Regex;

use crate::check::custom::check_multi_types;
use crate::check::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched_with};
use crate::token::{Token, TokenCollection, TokenCollectionOptions, TokenEachCheck};

use ExpectType::{Common, Const};

/// JS `.`: any character but a line terminator.
const DOT: &str = r"[^\n\r\x{2028}\x{2029}]";
/// The characters of JS `\s`.
const JS_WS: &str = r"\t\n\x0B\x0C\r \x{A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}";

fn compile(patterns: &[&str]) -> Vec<Regex> {
    patterns
        .iter()
        .map(|p| {
            let p = p.replace("{DOT}", DOT).replace("{WS}", JS_WS);
            Regex::new(&p).unwrap_or_else(|e| panic!("invalid pattern {p}: {e}"))
        })
        .collect()
}

fn tokens_of(value: &str, patterns: &[Regex], repeat: bool) -> TokenCollection {
    let refs: Vec<&Regex> = patterns.iter().collect();
    TokenCollection::from_patterns(value, &refs, TokenCollectionOptions::default(), repeat)
}

fn tokens_of_token(token: &Token, patterns: &[Regex]) -> TokenCollection {
    let refs: Vec<&Regex> = patterns.iter().collect();
    TokenCollection::from_patterns_token(token, &refs, TokenCollectionOptions::default(), false)
}

fn expects(list: &[(ExpectType, &str)]) -> Vec<Expect> {
    list.iter()
        .map(|(type_, value)| Expect {
            type_: type_.clone(),
            value: (*value).to_owned(),
        })
        .collect()
}

/// The token, unless it is absent or empty (TS `!token || !token.value`).
fn non_empty(token: Option<&Token>) -> Option<&Token> {
    token.filter(|t| !t.value.is_empty())
}

/// TS `token.matches(/^\d+$/)`.
fn is_digits(value: &str) -> bool {
    !value.is_empty() && value.bytes().all(|b| b.is_ascii_digit())
}

/// TS `unmatched(raw, reason, { expects, partName })`.
#[allow(clippy::unnecessary_wraps)] // the shape a token check returns
fn unmatched_raw(raw: &str, reason: Reason, exp: Vec<Expect>, part_name: Option<&str>) -> Option<CheckResult> {
    Some(unmatched_with(
        raw,
        reason,
        UnmatchedOpts {
            expects: Some(exp),
            part_name: part_name.map(str::to_owned),
            ..Default::default()
        },
    ))
}

/// TS `unmatched('', 'missing-token', { expects, partName })`.
fn missing(exp: &[(ExpectType, &str)], part_name: Option<&str>) -> Option<CheckResult> {
    unmatched_raw("", Reason::MissingToken, expects(exp), part_name)
}

/// TS `token.unmatched({ reason, expects, partName })`.
#[allow(clippy::unnecessary_wraps)] // the shape a token check returns
fn token_unmatched(
    token: &Token,
    reason: Reason,
    exp: Option<Vec<Expect>>,
    part_name: Option<&str>,
) -> Option<CheckResult> {
    Some(token.unmatched_result(
        Some(reason),
        UnmatchedOpts {
            expects: exp,
            part_name: part_name.map(str::to_owned),
            ..Default::default()
        },
    ))
}

fn out_of_range(gt: Option<f64>, gte: Option<f64>, lte: Option<f64>) -> Reason {
    Reason::OutOfRangeWithBounds { gt, gte, lt: None, lte }
}

fn length_digit(gte: usize, lte: Option<usize>) -> Reason {
    Reason::OutOfRangeLengthDigit { gte, lte }
}

const DAYS_OF_MONTH: [f64; 13] = [
    0.0, 31.0, 28.0, 31.0, 30.0, 31.0, 30.0, 31.0, 31.0, 30.0, 31.0, 30.0, 31.0,
];

/// TS `getMaxWeekNum`: the number of weeks of the week-year `year`.
///
/// > A week-year with a number year has 53 weeks if it corresponds to either a year year in the
/// > proleptic Gregorian calendar that has a Thursday as its first day (January 1st), or a year
/// > year in the proleptic Gregorian calendar that has a Wednesday as its first day (January 1st)
/// > and where year is a number divisible by 400, or a number divisible by 4 but not by 100. All
/// > other week-years have 52 weeks.
///
/// The weekday is computed arithmetically, as TS does, so the result does not depend on the time
/// zone of the process nor on the range of a date. Only `year` mod 400 matters, since the Gregorian
/// calendar repeats every 400 years. Any integer is accepted (0 and below too).
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#weeks>
#[must_use]
#[allow(clippy::float_cmp)] // the weekday is a small integer held in a float, as in JS
pub fn get_max_week_num(year: f64) -> f64 {
    const THURSDAY: f64 = 4.0;
    const WEDNESDAY: f64 = 3.0;
    let first_day = weekday_of_january_first(year);
    if first_day == THURSDAY || (first_day == WEDNESDAY && is_leap_year(year)) {
        53.0
    } else {
        52.0
    }
}

/// [`get_max_week_num`] for a year as an integer.
#[must_use]
pub fn max_week_number(year: u32) -> u32 {
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let n = get_max_week_num(f64::from(year)) as u32;
    n
}

/// TS `isLeapYear`.
fn is_leap_year(year: f64) -> bool {
    (year % 4.0 == 0.0 && year % 100.0 != 0.0) || year % 400.0 == 0.0
}

/// TS `getWeekdayOfJanuaryFirst`: Gauss's algorithm for the weekday of January 1st in the proleptic
/// Gregorian calendar (0 = Sunday … 6 = Saturday).
fn weekday_of_january_first(year: f64) -> f64 {
    let y = year - 1.0;
    modulo(
        1.0 + 5.0 * modulo(y, 4.0) + 4.0 * modulo(y, 100.0) + 6.0 * modulo(y, 400.0),
        7.0,
    )
}

/// TS `mod`: the remainder with the sign of the divisor, so that the year 0 and below stay in `0..m`.
fn modulo(n: f64, m: f64) -> f64 {
    ((n % m) + m) % m
}

/// TS `datetimeTokenCheck`, with its `_yearMod400` / `_month` state.
#[derive(Default)]
struct DatetimeTokenCheck {
    /// The year as the remainder of the year divided by 400.
    ///
    /// The Gregorian calendar repeats every 400 years, so the remainder decides the leap year and
    /// the weekday. It is taken from the last four digits (10000 is a multiple of 400), not from the
    /// whole year as a number: the grammar allows any number of digits, and a number rounds a year
    /// past 2^53. It stays `None` while the year is invalid.
    year_mod400: Cell<Option<u32>>,
    month: Cell<Option<f64>>,
}

impl DatetimeTokenCheck {
    /// > Four or more ASCII digits, representing year, where year > 0
    fn year(&self, token: Option<&Token>) -> Option<CheckResult> {
        self.year_mod400.set(None);
        let Some(t) = non_empty(token) else {
            return missing(&[(Common, "year")], Some("year"));
        };
        if !is_digits(&t.value) {
            return token_unmatched(t, Reason::UnexpectedToken, Some(vec![]), Some("year"));
        }
        if t.value.len() < 4 {
            return token_unmatched(t, length_digit(4, None), Some(vec![]), Some("year"));
        }
        if t.to_number() <= 0.0 {
            return token_unmatched(t, out_of_range(Some(0.0), None, None), Some(vec![]), Some("year"));
        }
        // The digits are ASCII and there are at least four of them.
        let last_four = &t.value[t.value.len() - 4..];
        self.year_mod400.set(last_four.parse::<u32>().ok().map(|n| n % 400));
        None
    }

    /// > Two ASCII digits, representing the month month, in the range 1 ≤ month ≤ 12
    fn month(&self, token: Option<&Token>) -> Option<CheckResult> {
        self.month.set(None);
        let Some(t) = non_empty(token) else {
            return missing(&[(Common, "month")], Some("month"));
        };
        if let Some(res) = two_digits(t, "month") {
            return Some(res);
        }
        let month = t.to_number();
        self.month.set(Some(month));
        range(t, month, 1.0, 12.0, "month")
    }

    /// > Two ASCII digits, representing day, in the range 1 ≤ day ≤ maxday where maxday is the
    /// > number of days in the month month and year year
    ///
    /// A date without a valid year (a yearless date) is checked against a leap year.
    #[allow(clippy::float_cmp)] // JS `===` on a month parsed from two digits
    fn date(&self, token: Option<&Token>) -> Option<CheckResult> {
        let Some(t) = non_empty(token) else {
            return missing(&[(Common, "date")], Some("date"));
        };
        if let Some(res) = two_digits(t, "date") {
            return Some(res);
        }
        let year_mod400 = f64::from(self.year_mod400.get().unwrap_or(0));
        let is_leap = is_leap_year(year_mod400);
        let month = self.month.get().unwrap_or(1.0);
        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        let days = if month.fract() == 0.0 && (0.0..=12.0).contains(&month) {
            DAYS_OF_MONTH[month as usize]
        } else {
            0.0
        };
        let day_of_month = days + if month == 2.0 && is_leap { 1.0 } else { 0.0 };
        range(t, t.to_number(), 1.0, day_of_month, "date")
    }

    /// > Two ASCII digits, representing the week week, in the range 1 ≤ week ≤ maxweek
    fn week(&self, token: Option<&Token>) -> Option<CheckResult> {
        let Some(t) = non_empty(token) else {
            return missing(&[(Common, "week")], Some("week"));
        };
        if let Some(res) = two_digits(t, "week") {
            return Some(res);
        }
        // An invalid year is reported by its own check, and no week count can be derived from it:
        // the week is then held to the most any week-year has, 53.
        let max_week = self
            .year_mod400
            .get()
            .map_or(53.0, |year_mod400| get_max_week_num(f64::from(year_mod400)));
        range(t, t.to_number(), 1.0, max_week, "week")
    }
}

/// The `^\d+$` and length-2 checks of a two-digit part.
fn two_digits(t: &Token, part: &str) -> Option<CheckResult> {
    if !is_digits(&t.value) {
        return token_unmatched(t, Reason::UnexpectedToken, Some(vec![]), Some(part));
    }
    if t.value.len() != 2 {
        return token_unmatched(t, length_digit(2, Some(2)), Some(vec![]), Some(part));
    }
    None
}

/// TS `!(min <= n && n <= max)`: `NaN` bounds fail.
fn range(t: &Token, n: f64, min: f64, max: f64, part: &str) -> Option<CheckResult> {
    if min <= n && n <= max {
        return None;
    }
    token_unmatched(t, out_of_range(None, Some(min), Some(max)), Some(vec![]), Some(part))
}

/// A two-digit part in `min..=max` (hour, minute, second).
fn clock_part(token: Option<&Token>, part: &str, max: f64) -> Option<CheckResult> {
    let Some(t) = non_empty(token) else {
        return missing(&[(Common, part)], Some(part));
    };
    if let Some(res) = two_digits(t, part) {
        return Some(res);
    }
    range(t, t.to_number(), 0.0, max, part)
}

/// > Two ASCII digits, representing hour, in the range 0 ≤ hour ≤ 23
fn hour(token: Option<&Token>) -> Option<CheckResult> {
    clock_part(token, "hour", 23.0)
}

/// > Two ASCII digits, representing minute, in the range 0 ≤ minute ≤ 59
fn minute(token: Option<&Token>) -> Option<CheckResult> {
    clock_part(token, "minute", 59.0)
}

/// > Two ASCII digits, representing the integer part of second, in the range 0 ≤ s ≤ 59
fn second(token: Option<&Token>) -> Option<CheckResult> {
    clock_part(token, "second", 59.0)
}

/// > One, two, or three ASCII digits, representing the fractional part of second
fn second_fractional_part(token: Option<&Token>) -> Option<CheckResult> {
    let part = "fractional part";
    let Some(t) = non_empty(token) else {
        return missing(&[(Common, part)], Some(part));
    };
    if !is_digits(&t.value) {
        return token_unmatched(t, Reason::UnexpectedToken, Some(vec![]), Some(part));
    }
    if !(1..=3).contains(&t.value.len()) {
        return token_unmatched(t, length_digit(1, Some(3)), Some(vec![]), Some(part));
    }
    None
}

/// A one-character separator: `sep` is required, or optional when `or_end` (an absent one then
/// ends the whole check as matched, as TS `matched()` does).
fn separator(
    token: Option<&Token>,
    accepted: &[&str],
    exp: &[(ExpectType, &str)],
    part_name: Option<&str>,
    or_end: bool,
) -> Option<CheckResult> {
    let Some(t) = non_empty(token) else {
        return if or_end {
            Some(matched())
        } else {
            missing(exp, part_name)
        };
    };
    if !t.matches_any(accepted, false) {
        return token_unmatched(t, Reason::UnexpectedToken, Some(expects(exp)), part_name);
    }
    None
}

/// > A U+002D HYPHEN-MINUS character (-)
fn hyphen(token: Option<&Token>) -> Option<CheckResult> {
    separator(token, &["-"], &[(Common, "hyphen")], Some("datetime"), false)
}

/// > A U+003A COLON character (:)
fn colon(token: Option<&Token>) -> Option<CheckResult> {
    separator(token, &[":"], &[(Common, "colon")], Some("time"), false)
}

/// A colon, or the end of the value.
fn colon_or_end(token: Option<&Token>) -> Option<CheckResult> {
    separator(token, &[":"], &[(Common, "colon")], Some("time"), true)
}

/// A U+002E FULL STOP character (.), or the end of the value.
fn decimal_point_or_end(token: Option<&Token>) -> Option<CheckResult> {
    separator(token, &["."], &[(Common, "decimal point")], Some("second"), true)
}

/// > A U+0054 LATIN CAPITAL LETTER T character (T) or a U+0020 SPACE character
fn local_date_time_separator(token: Option<&Token>) -> Option<CheckResult> {
    separator(token, &["T", " "], &[(Const, "T"), (Common, "space")], None, false)
}

/// > A U+0054 LATIN CAPITAL LETTER T character (T)
fn normalized_local_date_time_separator(token: Option<&Token>) -> Option<CheckResult> {
    separator(token, &["T"], &[(Const, "T")], None, false)
}

/// > A U+0057 LATIN CAPITAL LETTER W character (W)
fn week_sign(token: Option<&Token>) -> Option<CheckResult> {
    separator(token, &["W"], &[(Const, "W")], Some("week"), false)
}

/// What is left after the last part.
fn extra(token: Option<&Token>) -> Option<CheckResult> {
    let t = non_empty(token)?;
    Some(t.unmatched_result(Some(Reason::ExtraToken), UnmatchedOpts::default()))
}

type Each<'a> = TokenEachCheck<'a>;

/// A callback of [`TokenCollection::each_check`].
fn cb<'a>(f: impl Fn(Option<&Token>, &TokenCollection) -> Option<CheckResult> + 'a) -> Each<'a> {
    Box::new(f)
}

/// A callback that reads only the token.
fn each<'a>(f: impl Fn(Option<&Token>) -> Option<CheckResult> + 'a) -> Each<'a> {
    Box::new(move |t, _| f(t))
}

/// The date parts `YYYY-MM-DD` of a check that holds its year and month in `st`.
fn date_parts(st: &DatetimeTokenCheck) -> [Each<'_>; 5] {
    [
        cb(move |t, _| st.year(t)),
        each(hyphen),
        cb(move |t, _| st.month(t)),
        each(hyphen),
        cb(move |t, _| st.date(t)),
    ]
}

/// The time parts `hh:mm[:ss[.sss]]`.
fn time_parts() -> [Each<'static>; 7] {
    [
        each(hour),
        each(colon),
        each(minute),
        each(colon_or_end),
        each(second),
        each(decimal_point_or_end),
        each(second_fractional_part),
    ]
}

static P_DATE: LazyLock<Vec<Regex>> =
    LazyLock::new(|| compile(&[r"[^-]*", r"[^0-9]?", r"[^-]*", r"[^0-9]", r"{DOT}[0-9]*"]));

/// TS `checkDateString`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates>
#[must_use]
pub fn check_date_string(value: &str) -> CheckResult {
    let tokens = tokens_of(value, &P_DATE, false);
    let st = &DatetimeTokenCheck::default();
    let mut callbacks: Vec<Each<'_>> = date_parts(st).into_iter().collect();
    callbacks.push(each(extra));
    tokens.each_check(&callbacks)
}

static P_TIME: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile(&[
        r"[^:]*",
        r"[^0-9]?",
        r"[^:]*",
        r"[^0-9]?",
        r"[^.]*",
        r"[^0-9]?",
        r"{DOT}[0-9]*",
    ])
});

/// TS `checkTimeString`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#times>
#[must_use]
pub fn check_time_string(value: &str) -> CheckResult {
    tokens_of(value, &P_TIME, false).each_check(&time_parts())
}

static P_MONTH: LazyLock<Vec<Regex>> = LazyLock::new(|| compile(&[r"[^-]*", r"[^0-9]?", r"{DOT}[0-9]*"]));

/// TS `checkMonthString`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-month-string>
#[must_use]
pub fn check_month_string(value: &str) -> CheckResult {
    let st = &DatetimeTokenCheck::default();
    tokens_of(value, &P_MONTH, false).each_check(&[
        cb(move |t, _| st.year(t)),
        each(hyphen),
        cb(move |t, _| st.month(t)),
        each(extra),
    ])
}

/// TS `checkYearlessDateString`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#yearless-dates>
#[must_use]
pub fn check_yearless_date_string(value: &str) -> CheckResult {
    let st = &DatetimeTokenCheck::default();
    tokens_of(value, &P_MONTH, false).each_check(&[
        cb(move |t, _| st.month(t)),
        each(hyphen),
        cb(move |t, _| st.date(t)),
        each(extra),
    ])
}

static P_WEEK: LazyLock<Vec<Regex>> = LazyLock::new(|| compile(&[r"[^-]+", r"[^W]?", r"[^0-9]?", r"{DOT}[0-9]*"]));

/// TS `checkWeekString`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#weeks>
#[must_use]
pub fn check_week_string(value: &str) -> CheckResult {
    let st = &DatetimeTokenCheck::default();
    tokens_of(value, &P_WEEK, false).each_check(&[
        cb(move |t, _| st.year(t)),
        each(hyphen),
        each(week_sign),
        cb(move |t, _| st.week(t)),
        each(extra),
    ])
}

static P_YEAR: LazyLock<Vec<Regex>> = LazyLock::new(|| compile(&[r"{DOT}*"]));

/// TS `checkYearString`.
#[must_use]
pub fn check_year_string(value: &str) -> CheckResult {
    let st = &DatetimeTokenCheck::default();
    tokens_of(value, &P_YEAR, false).each_check(&[cb(move |t, _| st.year(t)), each(extra)])
}

/// The patterns of a local date and time; `date_end` is the class that ends the day part.
fn local_patterns(date_end: &str) -> Vec<Regex> {
    let dd = format!("[^{date_end}]*");
    compile(&[
        r"[^-]*",
        r"[^0-9]?",
        r"[^-]*",
        r"[^0-9]?",
        &dd,
        r"[^0-9]?",
        r"[^:]*",
        r"[^0-9]?",
        r"[^:]*",
        r"[^0-9]?",
        r"[^.]*",
        r"[^0-9]?",
        r"{DOT}[0-9]*",
    ])
}

static P_LOCAL: LazyLock<Vec<Regex>> = LazyLock::new(|| local_patterns("{WS}T"));
static P_NORMALIZED_LOCAL: LazyLock<Vec<Regex>> = LazyLock::new(|| local_patterns("T"));

fn check_local(tokens: &TokenCollection, separator: fn(Option<&Token>) -> Option<CheckResult>) -> CheckResult {
    let st = &DatetimeTokenCheck::default();
    let mut callbacks: Vec<Each<'_>> = date_parts(st).into_iter().collect();
    callbacks.push(each(separator));
    callbacks.extend(time_parts());
    callbacks.push(each(extra));
    tokens.each_check(&callbacks)
}

/// TS `checkLocalDateAndTimeString`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-local-date-and-time-string>
#[must_use]
pub fn check_local_date_and_time_string(value: &str) -> CheckResult {
    check_local(&tokens_of(value, &P_LOCAL, false), local_date_time_separator)
}

/// TS `checkNormalizedLocalDateAndTimeString`: a local date and time with `T` as the separator
/// and the shortest time.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-normalised-local-date-and-time-string>
#[must_use]
pub fn check_normalized_local_date_and_time_string(value: &str) -> CheckResult {
    let tokens = tokens_of(value, &P_NORMALIZED_LOCAL, false);
    let res = check_local(&tokens, normalized_local_date_time_separator);
    if !res.is_matched() {
        return res;
    }
    // > A valid time string representing the time, expressed as the shortest possible string for
    // > the given time (e.g. omitting the seconds component entirely if the given time is zero
    // > seconds past the minute)
    let (Some(second), Some(fp)) = (tokens.tokens.get(10), tokens.tokens.get(12)) else {
        return res;
    };
    let second_n = second.to_number();
    let fp_n = fp.to_number();
    if !second.value.is_empty() && second_n == 0.0 && (fp.value.is_empty() || fp_n == 0.0) {
        return second.unmatched_result(
            Some(Reason::ExtraToken),
            UnmatchedOpts {
                part_name: Some("second".to_owned()),
                ..Default::default()
            },
        );
    }
    if !fp.value.is_empty() && fp_n == 0.0 {
        return fp.unmatched_result(
            Some(Reason::ExtraToken),
            UnmatchedOpts {
                part_name: Some("fractional part".to_owned()),
                ..Default::default()
            },
        );
    }
    res
}

static P_TIME_ZONE: LazyLock<Vec<Regex>> =
    LazyLock::new(|| compile(&[r"[^0-9]?", r"[^:]{0,2}", r"[^0-9]?", r"{DOT}[0-9]*"]));

/// TS `parseTimeZone` over `tokens`, `value` being the zone's text.
fn parse_time_zone(value: &str, tokens: &TokenCollection) -> CheckResult {
    let sign_check: Each<'_> = cb(move |sign, tail| {
        let Some(sign) = non_empty(sign) else {
            return unmatched_raw(
                value,
                Reason::MissingToken,
                expects(&[(Const, "Z"), (Const, "+"), (Const, "-")]),
                Some("time-zone"),
            );
        };
        if sign.matches_str("Z", false) {
            let tail_value = tail.value();
            if !tail_value.is_empty() {
                return Some(tail.tokens.first().map_or_else(
                    || unmatched_with(&tail_value, Reason::ExtraToken, UnmatchedOpts::default()),
                    |t| t.unmatched_result(Some(Reason::ExtraToken), UnmatchedOpts::default()),
                ));
            }
            return Some(matched());
        }
        if !sign.matches_any(&["+", "-"], false) {
            return token_unmatched(
                sign,
                Reason::UnexpectedToken,
                Some(expects(&[(Const, "+"), (Const, "-")])),
                Some("time-zone"),
            );
        }
        None
    });
    let colon_check = each(|colon| {
        let colon = non_empty(colon)?;
        if !colon.matches_str(":", false) {
            return token_unmatched(
                colon,
                Reason::UnexpectedToken,
                Some(expects(&[(Const, ":")])),
                Some("time-zone"),
            );
        }
        None
    });
    tokens.each_check(&[sign_check, each(hour), colon_check, each(minute), each(extra)])
}

/// TS `checkTimeZoneOffsetString`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#time-zones>
#[must_use]
pub fn check_time_zone_offset_string(value: &str) -> CheckResult {
    parse_time_zone(value, &tokens_of(value, &P_TIME_ZONE, false))
}

static P_GLOBAL: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile(&[
        r"[^-]*",
        r"[^0-9]?",
        r"[^-]*",
        r"[^0-9]?",
        r"[^{WS}T]*",
        r"[^0-9]?",
        r"[^:]*",
        r"[^0-9]?",
        r"[^+:Z-]*",
        // `:ss.sss`, restricted to digits and the decimal point so that an invalid fraction
        // separator (e.g. `,`) is left in the time-zone part, where it is rejected.
        r"(:[0-9.]*)?",
        r"{DOT}*",
    ])
});

static P_GLOBAL_SECOND: LazyLock<Vec<Regex>> = LazyLock::new(|| compile(&[r":?", r"[0-9]*", r"\.?", r"[0-9]*"]));

/// TS `checkGlobalDateAndTimeString`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#global-dates-and-times>
#[must_use]
pub fn check_global_date_and_time_string(value: &str) -> CheckResult {
    let tokens = tokens_of(value, &P_GLOBAL, false);
    let st = &DatetimeTokenCheck::default();
    let mut callbacks: Vec<Each<'_>> = date_parts(st).into_iter().collect();
    callbacks.extend([
        each(local_date_time_separator),
        each(hour),
        each(colon),
        each(minute),
        each(|second_token| {
            let second_token = non_empty(second_token)?;
            let second_tokens = tokens_of_token(second_token, &P_GLOBAL_SECOND);
            let res = second_tokens.each_check(&[
                each(colon),
                each(second),
                each(decimal_point_or_end),
                each(second_fractional_part),
            ]);
            if res.is_matched() { None } else { Some(res) }
        }),
        cb(move |zone, _| {
            let Some(zone) = non_empty(zone) else {
                return unmatched_raw(
                    value,
                    Reason::MissingToken,
                    expects(&[(Common, "time-zone")]),
                    Some("time-zone"),
                );
            };
            let res = parse_time_zone(&zone.value, &tokens_of_token(zone, &P_TIME_ZONE));
            if res.is_matched() { None } else { Some(res) }
        }),
        each(extra),
    ]);
    tokens.each_check(&callbacks)
}

/// TS `checkDateStringWithOptionalTime`: a date string, or a global date and time string.
///
/// @see <https://html.spec.whatwg.org/multipage/edits.html#attr-mod-datetime>
#[must_use]
pub fn check_date_string_with_optional_time(value: &str) -> CheckResult {
    check_multi_types(value, &[&check_date_string, &check_global_date_and_time_string])
}

static P_DURATION: LazyLock<Vec<Regex>> = LazyLock::new(|| compile(&[r"[^0-9T]?", r"[^T]*", r"[^0-9]?", r"{DOT}*"]));
static P_DURATION_DATE: LazyLock<Vec<Regex>> = LazyLock::new(|| compile(&[r"[0-9]+", r"{DOT}"]));
static P_DURATION_TIME: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile(&[
        r"[0-9]+(\.[0-9]*)?[^0-9]?",
        r"[0-9]+(\.[0-9]*)?[^0-9]?",
        r"[0-9]+(\.[0-9]*)?[^0-9]?",
    ])
});
static P_DURATION_TIME_PART: LazyLock<Vec<Regex>> = LazyLock::new(|| compile(&[r"[0-9]+", r"(\.[0-9]*)?", r"[^0-9]+"]));
static P_DP_FP: LazyLock<Vec<Regex>> = LazyLock::new(|| compile(&[r"\.", r"[0-9]+"]));

/// The `PnD` part of an ISO 8601-like duration.
fn duration_date_part(d: Option<&Token>) -> Option<CheckResult> {
    let d = non_empty(d)?;
    let parts = tokens_of_token(d, &P_DURATION_DATE);
    let num = parts.tokens.first()?;
    if !is_digits(&num.value) {
        return token_unmatched(num, Reason::UnexpectedToken, Some(vec![]), Some("date"));
    }
    let Some(sign) = non_empty(parts.tokens.get(1)) else {
        return missing(&[(Const, "D")], Some("date"));
    };
    if !sign.matches_str("D", false) {
        return token_unmatched(
            sign,
            Reason::UnexpectedToken,
            Some(expects(&[(Const, "D")])),
            Some("date"),
        );
    }
    if let Some(extra) = non_empty(parts.tokens.get(2)) {
        return token_unmatched(extra, Reason::UnexpectedToken, Some(expects(&[(Const, "T")])), None);
    }
    None
}

/// The `nHnMnS` part of an ISO 8601-like duration.
fn duration_time_part(time: Option<&Token>) -> Option<CheckResult> {
    const HMS: [(ExpectType, &str); 3] = [(Const, "H"), (Const, "M"), (Const, "S")];
    let Some(time) = time else {
        return missing(
            &[(Common, "hour"), (Common, "minute"), (Common, "second")],
            Some("time"),
        );
    };
    let time_tokens = tokens_of_token(time, &P_DURATION_TIME);
    let joined: String = time_tokens.tokens.iter().take(3).map(|t| t.value.as_str()).collect();
    if joined.is_empty() {
        return missing(&[(Common, "hour"), (Common, "minute"), (Common, "second")], None);
    }
    let mut specified: Vec<String> = Vec::new();
    let remaining = |specified: &Vec<String>| {
        let left: Vec<(ExpectType, &str)> = HMS
            .iter()
            .filter(|(_, v)| !specified.iter().any(|s| s == v))
            .cloned()
            .collect();
        expects(&left)
    };
    for t in &time_tokens.tokens {
        if t.value.is_empty() {
            continue;
        }
        if specified.iter().any(|s| s == "S") {
            return Some(t.unmatched_result(Some(Reason::ExtraToken), UnmatchedOpts::default()));
        }
        let parts = tokens_of_token(t, &P_DURATION_TIME_PART);
        let Some(num) = parts.tokens.first() else {
            continue;
        };
        if !is_digits(&num.value) {
            return token_unmatched(
                num,
                Reason::UnexpectedToken,
                Some(expects(&[(Common, "number")])),
                Some("time"),
            );
        }
        if let Some(dpfp) = non_empty(parts.tokens.get(1)) {
            let dot_fraction = tokens_of_token(dpfp, &P_DP_FP);
            let Some(dp) = dot_fraction.tokens.first() else {
                continue;
            };
            if !dp.matches_str(".", false) {
                return token_unmatched(dp, Reason::UnexpectedToken, Some(vec![]), Some("decimal point"));
            }
            let Some(fp) = non_empty(dot_fraction.tokens.get(1)) else {
                return missing(&[(Common, "fractional part")], Some("second"));
            };
            if !is_digits(&fp.value) {
                return token_unmatched(fp, Reason::UnexpectedToken, Some(vec![]), Some("fractional part"));
            }
            if !(1..=3).contains(&fp.value.encode_utf16().count()) {
                return token_unmatched(fp, length_digit(1, Some(3)), Some(vec![]), Some("fractional part"));
            }
        }
        let Some(sign) = non_empty(parts.tokens.get(2)) else {
            return unmatched_raw("", Reason::MissingToken, remaining(&specified), Some("time"));
        };
        let has = |s: &str| specified.iter().any(|v| v == s);
        if has("M") && sign.matches_str("H", false) {
            return token_unmatched(
                sign,
                Reason::UnexpectedToken,
                Some(expects(&[(Const, "S")])),
                Some("time"),
            );
        }
        if !sign.matches_any(&["H", "M", "S"], false)
            || (sign.matches_str("H", false) && has("H"))
            || (sign.matches_str("M", false) && has("M"))
        {
            return token_unmatched(sign, Reason::UnexpectedToken, Some(remaining(&specified)), Some("time"));
        }
        specified.push(sign.value.clone());
    }
    None
}

/// TS `checkDurationISO8601LikeString`: `PnDTnHnMnS`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#durations>
#[must_use]
pub fn check_duration_iso8601_like_string(value: &str) -> CheckResult {
    tokens_of(value, &P_DURATION, false).each_check(&[
        each(|p| {
            let Some(p) = non_empty(p) else {
                return missing(&[(Const, "P")], Some("duration"));
            };
            if !p.matches_str("P", false) {
                return token_unmatched(
                    p,
                    Reason::UnexpectedToken,
                    Some(expects(&[(Const, "P")])),
                    Some("duration"),
                );
            }
            None
        }),
        each(duration_date_part),
        each(|t| {
            let Some(t) = non_empty(t) else {
                return missing(&[(Const, "T")], None);
            };
            if !t.matches_str("T", false) {
                return token_unmatched(t, Reason::UnexpectedToken, Some(expects(&[(Const, "T")])), None);
            }
            None
        }),
        each(duration_time_part),
        each(extra),
    ])
}

static P_DURATION_COMPONENT: LazyLock<Vec<Regex>> =
    LazyLock::new(|| compile(&[r"[{WS}]*", r"[0-9]+", r"(\.[0-9]*)?", r"[{WS}]*", r"[^0-9]", r"[{WS}]*"]));

/// TS `checkDurationComponentListString`: `4h 18m 3s`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#durations>
#[must_use]
pub fn check_duration_component_list_string(value: &str) -> CheckResult {
    const UNITS: [(ExpectType, &str); 5] = [(Const, "w"), (Const, "d"), (Const, "h"), (Const, "m"), (Const, "s")];
    if value.is_empty() {
        return unmatched_with(
            "",
            Reason::EmptyToken,
            UnmatchedOpts {
                expects: Some(expects(&[(Common, "time")])),
                ..Default::default()
            },
        );
    }
    let pattern_count = P_DURATION_COMPONENT.len();
    let tokens = tokens_of(value, &P_DURATION_COMPONENT, true);
    let specified: RefCell<Vec<String>> = RefCell::new(Vec::new());
    let unit_expects = || {
        let specified = specified.borrow();
        let left: Vec<(ExpectType, &str)> = UNITS
            .iter()
            .filter(|(_, v)| !specified.iter().any(|s| s == v))
            .cloned()
            .collect();
        expects(&left)
    };

    for component in tokens.chunk(pattern_count) {
        let dpfp_outer = component.tokens.get(2).cloned();
        let unit_outer = component.tokens.get(4).cloned();
        let has_dpfp = dpfp_outer.as_ref().is_some_and(|t| !t.value.is_empty());
        let has_unit = unit_outer.as_ref().is_some_and(|t| !t.value.is_empty());

        let res = component.each_check(&[
            cb(|_, _| None),
            cb(|num, _| {
                if non_empty(num).is_none() {
                    let reason = if has_dpfp || has_unit {
                        Reason::UnexpectedToken
                    } else {
                        Reason::MissingToken
                    };
                    return unmatched_raw("", reason, expects(&[(Common, "time")]), None);
                }
                None
            }),
            cb(|dpfp, _| {
                let dpfp = non_empty(dpfp)?;
                if specified.borrow().iter().any(|s| s == "s") {
                    return token_unmatched(dpfp, Reason::UnexpectedToken, Some(unit_expects()), Some("unit"));
                }
                let dot_fraction = tokens_of_token(dpfp, &P_DP_FP);
                let Some(fp) = non_empty(dot_fraction.tokens.get(1)) else {
                    return missing(&[(Common, "fractional part")], Some("fractional part"));
                };
                if !fp.value.bytes().any(|b| b.is_ascii_digit()) {
                    return token_unmatched(
                        fp,
                        Reason::UnexpectedToken,
                        Some(expects(&[(Common, "fractional part")])),
                        Some("fractional part"),
                    );
                }
                if !(1..=3).contains(&fp.value.encode_utf16().count()) {
                    return token_unmatched(fp, length_digit(1, Some(3)), Some(vec![]), Some("fractional part"));
                }
                None
            }),
            cb(|_, _| None),
            cb(|unit, _| {
                let exp = unit_expects();
                let Some(unit) = non_empty(unit) else {
                    return unmatched_raw("", Reason::MissingToken, exp, Some("unit"));
                };
                let unit_val = unit.value.to_lowercase();
                if specified.borrow().contains(&unit_val) {
                    return token_unmatched(unit, Reason::Duplicated, Some(exp), Some("unit"));
                }
                if has_dpfp && unit.matches_any(&["w", "d", "h", "m"], false) {
                    return token_unmatched(
                        unit,
                        Reason::UnexpectedToken,
                        Some(expects(&[(Const, "s")])),
                        Some("unit"),
                    );
                }
                if !unit.matches_any(&["w", "d", "h", "m", "s"], false) {
                    return token_unmatched(unit, Reason::UnexpectedToken, Some(exp), Some("unit"));
                }
                specified.borrow_mut().push(unit_val);
                None
            }),
            cb(|_, _| None),
        ]);
        if !res.is_matched() {
            return res;
        }
    }
    matched()
}

/// TS `checkDateTime`: any of the date and time microsyntaxes; the one that got furthest when
/// none matches.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates-and-times>
#[must_use]
pub fn check_datetime(value: &str) -> CheckResult {
    check_multi_types(
        value,
        &[
            &check_date_string,
            &check_time_string,
            &check_month_string,
            &check_yearless_date_string,
            &check_local_date_and_time_string,
            &check_normalized_local_date_and_time_string,
            &check_time_zone_offset_string,
            &check_global_date_and_time_string,
            &check_week_string,
            &check_year_string,
            &check_duration_iso8601_like_string,
            &check_duration_component_list_string,
        ],
    )
}

macro_rules! is_fns {
    ($($(#[$doc:meta])* $is:ident => $check:ident;)*) => {
        $(
            $(#[$doc])*
            #[must_use]
            pub fn $is(value: &str) -> bool {
                $check(value).is_matched()
            }
        )*
    };
}

is_fns! {
    /// Whether [`check_date_string`] matches.
    is_date_string => check_date_string;
    /// Whether [`check_time_string`] matches.
    is_time_string => check_time_string;
    /// Whether [`check_month_string`] matches.
    is_month_string => check_month_string;
    /// Whether [`check_year_string`] matches.
    is_year_string => check_year_string;
    /// Whether [`check_yearless_date_string`] matches.
    is_yearless_date_string => check_yearless_date_string;
    /// Whether [`check_week_string`] matches.
    is_week_string => check_week_string;
    /// Whether [`check_local_date_and_time_string`] matches.
    is_local_date_and_time_string => check_local_date_and_time_string;
    /// Whether [`check_normalized_local_date_and_time_string`] matches.
    is_normalized_local_date_and_time_string => check_normalized_local_date_and_time_string;
    /// Whether [`check_time_zone_offset_string`] matches.
    is_time_zone_offset_string => check_time_zone_offset_string;
    /// Whether [`check_global_date_and_time_string`] matches.
    is_global_date_and_time_string => check_global_date_and_time_string;
    /// Whether [`check_date_string_with_optional_time`] matches.
    is_date_string_with_optional_time => check_date_string_with_optional_time;
    /// Whether [`check_duration_iso8601_like_string`] matches.
    is_duration_iso8601_like_string => check_duration_iso8601_like_string;
    /// Whether [`check_duration_component_list_string`] matches.
    is_duration_component_list_string => check_duration_component_list_string;
    /// Whether [`check_datetime`] matches.
    is_datetime => check_datetime;
}
