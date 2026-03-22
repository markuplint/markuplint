use markuplint_types::whatwg::datetime::{
    is_date_string, is_datetime, is_duration_component_list_string, is_duration_iso8601_like_string,
    is_global_date_and_time_string, is_local_date_and_time_string, is_month_string,
    is_normalized_local_date_and_time_string, is_time_string, is_time_zone_offset_string, is_week_string,
    is_year_string, is_yearless_date_string, max_week_number,
};

#[test]
fn test_max_week_number() {
    assert_eq!(max_week_number(1976), 53);
    assert_eq!(max_week_number(1977), 52);
    assert_eq!(max_week_number(1978), 52);
    assert_eq!(max_week_number(1979), 52);
    assert_eq!(max_week_number(1981), 53);
}

#[test]
fn month_string_valid() {
    assert!(is_month_string("0001-01"));
    assert!(is_month_string("0001-12"));
    assert!(is_month_string("10001-01"));
}

#[test]
fn month_string_invalid() {
    assert!(!is_month_string(""));
    assert!(!is_month_string(" "));
    assert!(!is_month_string("a"));
    assert!(!is_month_string("0"));
    assert!(!is_month_string("0000"));
    // year ok but no separator
    assert!(!is_month_string("0001"));
    assert!(!is_month_string("0001:"));
    assert!(!is_month_string("0001-"));
    assert!(!is_month_string("0001-a"));
    assert!(!is_month_string("0001-0"));
    assert!(!is_month_string("0001-001"));
    assert!(!is_month_string("0001-00"));
    assert!(!is_month_string("0001-13"));
    // Extra trailing characters
    assert!(!is_month_string("0001-01-"));
}

#[test]
fn date_string_valid() {
    assert!(is_date_string("2000-01-01"));
    assert!(is_date_string("2000-01-31"));
    assert!(is_date_string("2000-02-28"));
    assert!(is_date_string("2000-02-29")); // 2000 is leap year
    assert!(is_date_string("2001-02-28"));
}

#[test]
fn date_string_invalid() {
    assert!(!is_date_string(""));
    assert!(!is_date_string(" "));
    assert!(!is_date_string("a"));
    assert!(!is_date_string("0"));
    assert!(!is_date_string("0000"));
    assert!(!is_date_string("2000"));
    assert!(!is_date_string("2000:"));
    assert!(!is_date_string("2000-"));
    assert!(!is_date_string("2000-a"));
    assert!(!is_date_string("2000-0"));
    assert!(!is_date_string("2000-00"));
    assert!(!is_date_string("2000-01"));
    assert!(!is_date_string("2000-01:"));
    assert!(!is_date_string("2000-01-"));
    assert!(!is_date_string("2000-01-a"));
    assert!(!is_date_string("2000-01-0"));
    assert!(!is_date_string("2000-01-001"));
    assert!(!is_date_string("2000-01-00"));
    assert!(!is_date_string("2000-01-32"));
    assert!(!is_date_string("2000-02-30")); // 2000 leap: max 29
    assert!(!is_date_string("2001-02-29")); // 2001 not leap: max 28
}

#[test]
fn yearless_date_string_valid() {
    assert!(is_yearless_date_string("01-01"));
    assert!(is_yearless_date_string("01-31"));
    assert!(is_yearless_date_string("02-28"));
    assert!(is_yearless_date_string("02-29")); // leap year assumed
}

#[test]
fn yearless_date_string_invalid() {
    assert!(!is_yearless_date_string(""));
    assert!(!is_yearless_date_string(" "));
    assert!(!is_yearless_date_string("a"));
    assert!(!is_yearless_date_string("0"));
    assert!(!is_yearless_date_string("00"));
    assert!(!is_yearless_date_string("01"));
    assert!(!is_yearless_date_string("01:"));
    assert!(!is_yearless_date_string("01-"));
    assert!(!is_yearless_date_string("01-a"));
    assert!(!is_yearless_date_string("01-0"));
    assert!(!is_yearless_date_string("01-00"));
    assert!(!is_yearless_date_string("01-32"));
    assert!(!is_yearless_date_string("02-30"));
}

#[test]
fn time_string_valid() {
    assert!(is_time_string("00:00"));
    assert!(is_time_string("00:59"));
    assert!(is_time_string("00:00:00"));
    assert!(is_time_string("00:00:59"));
    assert!(is_time_string("00:00:00.0"));
    assert!(is_time_string("00:00:00.9"));
    assert!(is_time_string("00:00:00.00"));
    assert!(is_time_string("00:00:00.99"));
    assert!(is_time_string("00:00:00.000"));
    assert!(is_time_string("00:00:00.999"));
}

#[test]
fn time_string_invalid() {
    assert!(!is_time_string(""));
    assert!(!is_time_string(" "));
    assert!(!is_time_string("a"));
    assert!(!is_time_string("0"));
    assert!(!is_time_string("000"));
    assert!(!is_time_string("24"));
    assert!(!is_time_string("00"));
    assert!(!is_time_string("00-"));
    assert!(!is_time_string("00:"));
    assert!(!is_time_string("00:a"));
    assert!(!is_time_string("00:0"));
    assert!(!is_time_string("00:000"));
    assert!(!is_time_string("00:60"));
    assert!(!is_time_string("00:00-"));
    assert!(!is_time_string("00:00:"));
    assert!(!is_time_string("00:00:a"));
    assert!(!is_time_string("00:00:0"));
    assert!(!is_time_string("00:00:000"));
    assert!(!is_time_string("00:00:60"));
    assert!(!is_time_string("00:00:00:"));
    assert!(!is_time_string("00:00:00."));
    assert!(!is_time_string("00:00:00.a"));
    assert!(!is_time_string("00:00:00.0000"));
    assert!(!is_time_string("00:00:00.1000"));
}

#[test]
fn local_date_and_time_string_valid() {
    assert!(is_local_date_and_time_string("2020-12-31T00:00:00.000"));
}

#[test]
fn local_date_and_time_string_invalid() {
    assert!(!is_local_date_and_time_string(""));
    assert!(!is_local_date_and_time_string(" "));
    assert!(!is_local_date_and_time_string("2020-12-31"));
    assert!(!is_local_date_and_time_string("2020-12-31:"));
    assert!(!is_local_date_and_time_string("2020-12-31T"));
    assert!(!is_local_date_and_time_string("2020-12-31 "));
    // Double space
    assert!(!is_local_date_and_time_string("2020-12-31  "));
}

#[test]
fn normalized_local_date_and_time_string_valid() {
    assert!(is_normalized_local_date_and_time_string("2020-12-31T00:00"));
    assert!(is_normalized_local_date_and_time_string("2020-12-31T00:00:01"));
    assert!(is_normalized_local_date_and_time_string("2020-12-31T00:00:00.001"));
}

#[test]
fn normalized_local_date_and_time_string_invalid() {
    assert!(!is_normalized_local_date_and_time_string(""));
    assert!(!is_normalized_local_date_and_time_string(" "));
    assert!(!is_normalized_local_date_and_time_string("2020-12-31"));
    assert!(!is_normalized_local_date_and_time_string("2020-12-31:"));
    assert!(!is_normalized_local_date_and_time_string("2020-12-31T"));
    // Space separator not allowed in normalized form
    assert!(!is_normalized_local_date_and_time_string("2020-12-31 "));
    // Zero seconds must be omitted
    assert!(!is_normalized_local_date_and_time_string("2020-12-31T00:00:00"));
    // Zero fractional must be omitted
    assert!(!is_normalized_local_date_and_time_string("2020-12-31T00:00:00.0"));
    assert!(!is_normalized_local_date_and_time_string("2020-12-31T00:00:00.00"));
    assert!(!is_normalized_local_date_and_time_string("2020-12-31T00:00:00.000"));
}

#[test]
fn time_zone_offset_valid() {
    assert!(is_time_zone_offset_string("Z"));
    assert!(is_time_zone_offset_string("+00:00"));
    assert!(is_time_zone_offset_string("+0000"));
}

#[test]
fn time_zone_offset_invalid() {
    assert!(!is_time_zone_offset_string(""));
    assert!(!is_time_zone_offset_string(" "));
    assert!(!is_time_zone_offset_string("a"));
    assert!(!is_time_zone_offset_string("z")); // lowercase z
    assert!(!is_time_zone_offset_string("Z:"));
    assert!(!is_time_zone_offset_string("ZZ"));
    assert!(!is_time_zone_offset_string("+"));
    assert!(!is_time_zone_offset_string("-"));
    assert!(!is_time_zone_offset_string("+-"));
    assert!(!is_time_zone_offset_string("+00"));
    assert!(!is_time_zone_offset_string("+00:"));
    assert!(!is_time_zone_offset_string("+24:00"));
    assert!(!is_time_zone_offset_string("+00:60"));
    assert!(!is_time_zone_offset_string("+000:00"));
    assert!(!is_time_zone_offset_string("+00:000"));
    assert!(!is_time_zone_offset_string("+00:00:"));
    assert!(!is_time_zone_offset_string("+2400"));
    assert!(!is_time_zone_offset_string("+0060"));
    assert!(!is_time_zone_offset_string("+00000"));
    assert!(!is_time_zone_offset_string("+0000:"));
}

#[test]
fn global_date_and_time_string_valid() {
    assert!(is_global_date_and_time_string("2000-01-01T00:00Z"));
    assert!(is_global_date_and_time_string("2000-01-01T00:00+0000"));
    assert!(is_global_date_and_time_string("2000-01-01T00:00+00:00"));
    assert!(is_global_date_and_time_string("2000-01-01T00:00-2359"));
    assert!(is_global_date_and_time_string("2000-01-01T00:00-23:59"));
    assert!(is_global_date_and_time_string("2000-01-01T00:00:00+0000"));
    assert!(is_global_date_and_time_string("2000-01-01T00:00:00.000+0000"));
}

#[test]
fn global_date_and_time_string_invalid() {
    assert!(!is_global_date_and_time_string("2000-01-01"));
    assert!(!is_global_date_and_time_string("2000-01-01T00:00"));
    assert!(!is_global_date_and_time_string("2000-01-01T00:00+"));
    assert!(!is_global_date_and_time_string("2000-01-01T00:00+00"));
    assert!(!is_global_date_and_time_string("2000-01-01T00:00:00.000+0000a"));
}

#[test]
fn week_string_valid() {
    assert!(is_week_string("2000-W01"));
    assert!(is_week_string("2000-W52"));
    assert!(is_week_string("2004-W01"));
    assert!(is_week_string("2004-W53"));
}

#[test]
fn week_string_invalid() {
    assert!(!is_week_string(""));
    assert!(!is_week_string(" "));
    assert!(!is_week_string("a"));
    assert!(!is_week_string("2000"));
    assert!(!is_week_string("2000-"));
    assert!(!is_week_string("2000-a"));
    assert!(!is_week_string("2000-W"));
    assert!(!is_week_string("2000-Wa"));
    assert!(!is_week_string("2000-W0"));
    assert!(!is_week_string("2000-W00"));
    assert!(!is_week_string("2000-W53")); // 2000 has 52 weeks
    assert!(!is_week_string("2004-W00"));
    assert!(!is_week_string("2004-W54")); // 2004 has 53 weeks
    assert!(!is_week_string("2000-W01a"));
}

#[test]
fn year_string_valid() {
    assert!(is_year_string("2000"));
    assert!(is_year_string("20000"));
}

#[test]
fn year_string_invalid() {
    assert!(!is_year_string(""));
    assert!(!is_year_string(" "));
    assert!(!is_year_string("a"));
    assert!(!is_year_string("200"));
    assert!(!is_year_string("0000"));
}

#[test]
fn duration_iso8601_like_valid() {
    assert!(is_duration_iso8601_like_string("P0DT0H"));
    assert!(is_duration_iso8601_like_string("P0DT0H0M"));
    assert!(is_duration_iso8601_like_string("P0DT0H0M0S"));
    assert!(is_duration_iso8601_like_string("P0DT0H0M0.000S"));
    assert!(is_duration_iso8601_like_string("P0DT0M"));
    assert!(is_duration_iso8601_like_string("P0DT0S"));
    assert!(is_duration_iso8601_like_string("P0DT0.0S"));
    assert!(is_duration_iso8601_like_string("P0DT0M0S"));
    assert!(is_duration_iso8601_like_string("P0DT0H0S"));
    assert!(is_duration_iso8601_like_string("P0DT0H0.0S"));
    assert!(is_duration_iso8601_like_string("PT4H18M3S"));
}

#[test]
fn duration_iso8601_like_invalid() {
    assert!(!is_duration_iso8601_like_string(""));
    assert!(!is_duration_iso8601_like_string(" "));
    assert!(!is_duration_iso8601_like_string("a"));
    assert!(!is_duration_iso8601_like_string("P"));
    assert!(!is_duration_iso8601_like_string("P0"));
    assert!(!is_duration_iso8601_like_string("P0D"));
    assert!(!is_duration_iso8601_like_string("P0H"));
    assert!(!is_duration_iso8601_like_string("P0Dt"));
    assert!(!is_duration_iso8601_like_string("P0DT"));
    assert!(!is_duration_iso8601_like_string("P0DT0"));
    assert!(!is_duration_iso8601_like_string("P0DT0H0"));
    assert!(!is_duration_iso8601_like_string("P0DT0H0M0"));
    assert!(!is_duration_iso8601_like_string("P0DT0H0M0."));
    assert!(!is_duration_iso8601_like_string("P0DT0H0M0M"));
    assert!(!is_duration_iso8601_like_string("P0DT0H0M0.0"));
    assert!(!is_duration_iso8601_like_string("P0DT0H0M0.0M"));
    assert!(!is_duration_iso8601_like_string("P0DT0H0M0.000"));
    assert!(!is_duration_iso8601_like_string("P0DT0H0M0.0000"));
    assert!(!is_duration_iso8601_like_string("P0DT0H0M0.000S0"));
    assert!(!is_duration_iso8601_like_string("P0DT0H0M0.000S0H"));
    assert!(!is_duration_iso8601_like_string("P0DT0M0H")); // wrong order
    assert!(!is_duration_iso8601_like_string("P0DT0S0M")); // after S
    assert!(!is_duration_iso8601_like_string("P0DT0.0S0M")); // after S
}

#[test]
fn duration_component_list_valid() {
    assert!(is_duration_component_list_string(" 0w"));
    assert!(is_duration_component_list_string("0w"));
    assert!(is_duration_component_list_string("0w "));
    assert!(is_duration_component_list_string("0w 0d"));
    assert!(is_duration_component_list_string("0w  0d"));
    assert!(is_duration_component_list_string(" 0w  0d"));
    assert!(is_duration_component_list_string(" 0w  0d "));
    assert!(is_duration_component_list_string("0w  0d  "));
    assert!(is_duration_component_list_string("\n0w\n0d\n"));
    assert!(is_duration_component_list_string("0w 0.0s"));
    assert!(is_duration_component_list_string("0w 0.00s"));
    assert!(is_duration_component_list_string("0w 0.000s"));
    assert!(is_duration_component_list_string("0w0d0h0m0.000s"));
    assert!(is_duration_component_list_string("0w 0d 0h 0m 0.000s"));
    assert!(is_duration_component_list_string("0w 0d0h 0m0.000s"));
}

#[test]
fn duration_component_list_invalid() {
    assert!(!is_duration_component_list_string(""));
    assert!(!is_duration_component_list_string(" "));
    assert!(!is_duration_component_list_string(" a"));
    assert!(!is_duration_component_list_string(" 0"));
    assert!(!is_duration_component_list_string(" 0a"));
    assert!(!is_duration_component_list_string(" 0ww"));
    assert!(!is_duration_component_list_string("0w 0"));
    assert!(!is_duration_component_list_string("0w 0w")); // duplicate
    assert!(!is_duration_component_list_string("0w 0."));
    assert!(!is_duration_component_list_string("0w 0.0"));
    assert!(!is_duration_component_list_string("0w 0.0d")); // fractional only with s
    assert!(!is_duration_component_list_string("0s 0."));
    assert!(!is_duration_component_list_string("0s 0.0"));
    assert!(!is_duration_component_list_string("0s 0.0s")); // duplicate s
    assert!(!is_duration_component_list_string("0w 0.0000s")); // too many fractional digits
    assert!(!is_duration_component_list_string("0s 0.000s"));
    assert!(!is_duration_component_list_string("0.000s 0s")); // duplicate
}

#[test]
fn datetime_combined() {
    // Valid for various formats
    assert!(is_datetime("2000-01-01")); // date
    assert!(is_datetime("00:00")); // time
    assert!(is_datetime("2000-01")); // month
    assert!(is_datetime("2000")); // year
    assert!(is_datetime("01-01")); // yearless date
    assert!(is_datetime("2000-W01")); // week
    assert!(is_datetime("2000-01-01T00:00Z")); // global date-time
    assert!(is_datetime("PT4H18M3S")); // duration ISO8601
    assert!(is_datetime("0w 0d")); // duration component list

    // Invalid
    assert!(!is_datetime("200-1-1"));
    assert!(!is_datetime("2001-02-29")); // not leap year
}
