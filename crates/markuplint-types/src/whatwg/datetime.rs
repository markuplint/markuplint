//! @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates-and-times>

fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(year) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

fn is_leap_year(year: u32) -> bool {
    (year.is_multiple_of(4) && !year.is_multiple_of(100)) || year.is_multiple_of(400)
}

/// A year has 53 ISO weeks if January 1 is a Thursday, or if January 1 is a
/// Wednesday and the year is a leap year.
pub fn max_week_number(year: u32) -> u32 {
    // Tomohiko Sakamoto's day-of-week algorithm; returns 0=Sunday .. 6=Saturday.
    fn day_of_week(y: u32, m: u32, d: u32) -> u32 {
        let t = [0_u32, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
        let y = if m < 3 { y - 1 } else { y };
        (y + y / 4 - y / 100 + y / 400 + t[(m - 1) as usize] + d) % 7
    }

    let jan1 = day_of_week(year, 1, 1);
    // ISO Thursday = 4 in the 0=Sunday convention above.
    if jan1 == 4 || (jan1 == 3 && is_leap_year(year)) {
        53
    } else {
        52
    }
}

fn parse_digits(s: &str, n: usize) -> Option<(u32, &str)> {
    if s.len() < n {
        return None;
    }
    let (digits, rest) = s.split_at(n);
    if !digits.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    Some((digits.parse().ok()?, rest))
}

fn parse_digits_greedy(s: &str) -> Option<(u32, usize, &str)> {
    let end = s.bytes().take_while(u8::is_ascii_digit).count();
    if end == 0 {
        return None;
    }
    let (digits, rest) = s.split_at(end);
    Some((digits.parse().ok()?, end, rest))
}

fn parse_year(s: &str) -> Option<(u32, &str)> {
    let (val, count, rest) = parse_digits_greedy(s)?;
    if count < 4 || val == 0 {
        return None;
    }
    Some((val, rest))
}

fn parse_month(s: &str) -> Option<(u32, &str)> {
    let (val, rest) = parse_digits(s, 2)?;
    if !(1..=12).contains(&val) {
        return None;
    }
    Some((val, rest))
}

fn parse_date(s: &str, year: u32, month: u32) -> Option<(u32, &str)> {
    let (val, rest) = parse_digits(s, 2)?;
    let max = days_in_month(year, month);
    if !(1..=max).contains(&val) {
        return None;
    }
    Some((val, rest))
}

fn parse_hour(s: &str) -> Option<(u32, &str)> {
    let (val, rest) = parse_digits(s, 2)?;
    if val > 23 {
        return None;
    }
    Some((val, rest))
}

fn parse_minute(s: &str) -> Option<(u32, &str)> {
    let (val, rest) = parse_digits(s, 2)?;
    if val > 59 {
        return None;
    }
    Some((val, rest))
}

fn parse_second(s: &str) -> Option<(u32, &str)> {
    let (val, rest) = parse_digits(s, 2)?;
    if val > 59 {
        return None;
    }
    Some((val, rest))
}

fn parse_optional_seconds(s: &str) -> Option<&str> {
    if s.is_empty() {
        return Some(s);
    }
    let rest = s.strip_prefix(':')?;
    let (_, rest) = parse_second(rest)?;
    if let Some(rest) = rest.strip_prefix('.') {
        let (_, frac_len, rest) = parse_digits_greedy(rest)?;
        if !(1..=3).contains(&frac_len) {
            return None;
        }
        Some(rest)
    } else {
        Some(rest)
    }
}

fn parse_time(s: &str) -> Option<&str> {
    let (_, rest) = parse_hour(s)?;
    let rest = rest.strip_prefix(':')?;
    let (_, rest) = parse_minute(rest)?;
    parse_optional_seconds(rest)
}

fn parse_time_zone(s: &str) -> Option<&str> {
    if let Some(rest) = s.strip_prefix('Z') {
        return Some(rest);
    }

    let rest = if s.starts_with('+') || s.starts_with('-') {
        &s[1..]
    } else {
        return None;
    };

    let (_, rest) = parse_hour(rest)?;

    let rest = rest.strip_prefix(':').unwrap_or(rest);
    let (_, rest) = parse_minute(rest)?;

    Some(rest)
}

/// Format: `YYYY-MM-DD`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates>
pub fn is_date_string(value: &str) -> bool {
    let Some((year, rest)) = parse_year(value) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix('-') else {
        return false;
    };
    let Some((month, rest)) = parse_month(rest) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix('-') else {
        return false;
    };
    let Some((_, rest)) = parse_date(rest, year, month) else {
        return false;
    };
    rest.is_empty()
}

/// Format: `HH:MM[:SS[.fff]]`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#times>
pub fn is_time_string(value: &str) -> bool {
    let Some(rest) = parse_time(value) else {
        return false;
    };
    rest.is_empty()
}

/// Format: `YYYY-MM`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-month-string>
pub fn is_month_string(value: &str) -> bool {
    let Some((_, rest)) = parse_year(value) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix('-') else {
        return false;
    };
    let Some((_, rest)) = parse_month(rest) else {
        return false;
    };
    rest.is_empty()
}

/// Format: 4+ digits, value > 0.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html>
pub fn is_year_string(value: &str) -> bool {
    let Some((_, rest)) = parse_year(value) else {
        return false;
    };
    rest.is_empty()
}

/// Format: `MM-DD`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#yearless-dates>
pub fn is_yearless_date_string(value: &str) -> bool {
    let Some((month, rest)) = parse_month(value) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix('-') else {
        return false;
    };
    // Use leap year (2000) for yearless dates per spec
    let Some((_, rest)) = parse_date(rest, 2000, month) else {
        return false;
    };
    rest.is_empty()
}

/// Format: `YYYY-Www`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#weeks>
pub fn is_week_string(value: &str) -> bool {
    let Some((year, rest)) = parse_year(value) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix("-W") else {
        return false;
    };
    let Some((week, rest)) = parse_digits(rest, 2) else {
        return false;
    };
    let max = max_week_number(year);
    if !(1..=max).contains(&week) {
        return false;
    }
    rest.is_empty()
}

/// Format: `YYYY-MM-DDThh:mm[:ss[.fff]]` (separator is `T` or space).
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-local-date-and-time-string>
pub fn is_local_date_and_time_string(value: &str) -> bool {
    let Some((year, rest)) = parse_year(value) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix('-') else {
        return false;
    };
    let Some((month, rest)) = parse_month(rest) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix('-') else {
        return false;
    };
    let Some((_, rest)) = parse_date(rest, year, month) else {
        return false;
    };
    // Separator: T or space
    let rest = if let Some(r) = rest.strip_prefix('T') {
        r
    } else if let Some(r) = rest.strip_prefix(' ') {
        r
    } else {
        return false;
    };
    let Some(rest) = parse_time(rest) else {
        return false;
    };
    rest.is_empty()
}

/// Format: `YYYY-MM-DDThh:mm[:ss[.fff]]` (T only, omits zero seconds).
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-normalised-local-date-and-time-string>
pub fn is_normalized_local_date_and_time_string(value: &str) -> bool {
    let Some((year, rest)) = parse_year(value) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix('-') else {
        return false;
    };
    let Some((month, rest)) = parse_month(rest) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix('-') else {
        return false;
    };
    let Some((_, rest)) = parse_date(rest, year, month) else {
        return false;
    };
    // Separator: T only (not space)
    let Some(rest) = rest.strip_prefix('T') else {
        return false;
    };
    let Some((_, rest)) = parse_hour(rest) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix(':') else {
        return false;
    };
    let Some((_, rest)) = parse_minute(rest) else {
        return false;
    };

    // Normalized: omit seconds if zero, omit fractional if zero
    if rest.is_empty() {
        return true;
    }

    let Some(rest) = rest.strip_prefix(':') else {
        return false;
    };
    let Some((sec, rest)) = parse_second(rest) else {
        return false;
    };

    if !rest.is_empty() {
        let Some(rest) = rest.strip_prefix('.') else {
            return false;
        };
        let Some((frac, frac_len, rest)) = parse_digits_greedy(rest) else {
            return false;
        };
        if !(1..=3).contains(&frac_len) || !rest.is_empty() {
            return false;
        }
        // Must not have zero fractional
        if frac == 0 {
            return false;
        }
        // Seconds can be zero if fractional is non-zero
        return true;
    }

    // No fractional part: seconds must be non-zero
    if sec == 0 {
        return false;
    }

    rest.is_empty()
}

/// Format: `Z` | `+HH:MM` | `-HH:MM` | `+HHMM` | `-HHMM`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#time-zones>
pub fn is_time_zone_offset_string(value: &str) -> bool {
    let Some(rest) = parse_time_zone(value) else {
        return false;
    };
    rest.is_empty()
}

/// Format: date + `T`/space + time + time-zone.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#global-dates-and-times>
pub fn is_global_date_and_time_string(value: &str) -> bool {
    let Some((year, rest)) = parse_year(value) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix('-') else {
        return false;
    };
    let Some((month, rest)) = parse_month(rest) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix('-') else {
        return false;
    };
    let Some((_, rest)) = parse_date(rest, year, month) else {
        return false;
    };
    // Separator: T or space
    let rest = if let Some(r) = rest.strip_prefix('T') {
        r
    } else if let Some(r) = rest.strip_prefix(' ') {
        r
    } else {
        return false;
    };
    let Some((_, rest)) = parse_hour(rest) else {
        return false;
    };
    let Some(rest) = rest.strip_prefix(':') else {
        return false;
    };
    let Some((_, rest)) = parse_minute(rest) else {
        return false;
    };

    let rest = if let Some(r) = rest.strip_prefix(':') {
        let Some((_, r)) = parse_second(r) else {
            return false;
        };
        if let Some(r) = r.strip_prefix('.') {
            let Some((_, frac_len, r)) = parse_digits_greedy(r) else {
                return false;
            };
            if !(1..=3).contains(&frac_len) {
                return false;
            }
            r
        } else {
            r
        }
    } else {
        rest
    };

    let Some(rest) = parse_time_zone(rest) else {
        return false;
    };
    rest.is_empty()
}

/// Format: `PnDTnHnMnS` (e.g., `PT4H18M3S`, `P0DT0H0M0.000S`).
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#durations>
pub fn is_duration_iso8601_like_string(value: &str) -> bool {
    let Some(rest) = value.strip_prefix('P') else {
        return false;
    };

    let rest = if rest.starts_with('T') || rest.is_empty() {
        rest
    } else {
        let Some((_, _, r)) = parse_digits_greedy(rest) else {
            return false;
        };
        let Some(r) = r.strip_prefix('D') else {
            return false;
        };
        r
    };

    let Some(rest) = rest.strip_prefix('T') else {
        return false;
    };

    if rest.is_empty() {
        return false;
    }

    let mut s = rest;
    let mut seen_h = false;
    let mut seen_m = false;
    let mut seen_s = false;

    while !s.is_empty() {
        if seen_s {
            return false;
        }

        let Some((_, _, after_num)) = parse_digits_greedy(s) else {
            return false;
        };

        // A fractional part is only permitted on the seconds component.
        let after_num = if let Some(frac_rest) = after_num.strip_prefix('.') {
            let Some((_, frac_len, r)) = parse_digits_greedy(frac_rest) else {
                return false;
            };
            if !(1..=3).contains(&frac_len) {
                return false;
            }
            r
        } else {
            after_num
        };

        let Some(unit) = after_num.as_bytes().first() else {
            return false;
        };
        let rest = &after_num[1..];

        match *unit {
            b'H' if !seen_h && !seen_m => {
                seen_h = true;
                s = rest;
            }
            b'M' if !seen_m => {
                seen_m = true;
                s = rest;
            }
            b'S' => {
                seen_s = true;
                s = rest;
            }
            _ => return false,
        }
    }

    true
}

/// Format: space-separated components like `1w 2d 3h 4m 5.5s`.
///
/// @see <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#durations>
pub fn is_duration_component_list_string(value: &str) -> bool {
    if value.is_empty() {
        return false;
    }

    let mut s = value;
    let mut seen = [false; 5]; // w, d, h, m, s
    let mut has_any = false;

    while !s.is_empty() {
        let trimmed = s.trim_start_matches(|c: char| c.is_ascii_whitespace());
        if trimmed.is_empty() {
            break;
        }
        s = trimmed;

        let Some((_, _, after_num)) = parse_digits_greedy(s) else {
            return false;
        };

        let (has_frac, after_num) = if let Some(frac_rest) = after_num.strip_prefix('.') {
            let Some((_, frac_len, r)) = parse_digits_greedy(frac_rest) else {
                return false;
            };
            if !(1..=3).contains(&frac_len) {
                return false;
            }
            (true, r)
        } else {
            (false, after_num)
        };

        let unit = match after_num.as_bytes().first() {
            Some(b'w' | b'W') => 0,
            Some(b'd' | b'D') => 1,
            Some(b'h' | b'H') => 2,
            Some(b'm' | b'M') => 3,
            Some(b's' | b'S') => 4,
            _ => return false,
        };

        // Fractional only allowed with seconds
        if has_frac && unit != 4 {
            return false;
        }

        // No duplicate units
        if seen[unit] {
            return false;
        }

        // Fractional not allowed after 's' was already seen
        if unit == 4 && has_frac && seen[4] {
            return false;
        }

        seen[unit] = true;
        has_any = true;
        s = &after_num[1..];
    }

    has_any
}

pub fn is_datetime(value: &str) -> bool {
    is_date_string(value)
        || is_time_string(value)
        || is_month_string(value)
        || is_yearless_date_string(value)
        || is_local_date_and_time_string(value)
        || is_normalized_local_date_and_time_string(value)
        || is_time_zone_offset_string(value)
        || is_global_date_and_time_string(value)
        || is_week_string(value)
        || is_year_string(value)
        || is_duration_iso8601_like_string(value)
        || is_duration_component_list_string(value)
}
