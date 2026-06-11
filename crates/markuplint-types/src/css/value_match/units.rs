//! CSS unit definitions.
//!
//! Complete unit tables sourced from css-tree's `units.js` and the
//! [CSS Values and Units Module Level 4 unit table](https://drafts.csswg.org/css-values/#lengths).

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum DimensionType {
    Length,
    Angle,
    Time,
    Frequency,
    Resolution,
    Flex,
}

/// The unit must be lowercase.
pub fn unit_type(unit: &str) -> Option<DimensionType> {
    match unit {
        "cm" | "mm" | "q" | "in" | "pt" | "pc" | "px" | "em" | "rem" | "ex" | "rex" | "cap" | "rcap" | "ch" | "rch"
        | "ic" | "ric" | "lh" | "rlh" | "vw" | "svw" | "lvw" | "dvw" | "vh" | "svh" | "lvh" | "dvh" | "vi" | "svi"
        | "lvi" | "dvi" | "vb" | "svb" | "lvb" | "dvb" | "vmin" | "svmin" | "lvmin" | "dvmin" | "vmax" | "svmax"
        | "lvmax" | "dvmax" | "cqw" | "cqh" | "cqi" | "cqb" | "cqmin" | "cqmax" => Some(DimensionType::Length),

        "deg" | "grad" | "rad" | "turn" => Some(DimensionType::Angle),

        "s" | "ms" => Some(DimensionType::Time),

        "hz" | "khz" => Some(DimensionType::Frequency),

        "dpi" | "dpcm" | "dppx" | "x" => Some(DimensionType::Resolution),

        "fr" => Some(DimensionType::Flex),

        _ => None,
    }
}

pub fn is_unit_of_type(unit: &str, dim: DimensionType) -> bool {
    unit_type(unit) == Some(dim)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn length_units() {
        let units = [
            "cm", "mm", "q", "in", "pt", "pc", "px", "em", "rem", "ex", "rex", "cap", "rcap", "ch", "rch", "ic", "ric",
            "lh", "rlh", "vw", "svw", "lvw", "dvw", "vh", "svh", "lvh", "dvh", "vi", "svi", "lvi", "dvi", "vb", "svb",
            "lvb", "dvb", "vmin", "svmin", "lvmin", "dvmin", "vmax", "svmax", "lvmax", "dvmax", "cqw", "cqh", "cqi",
            "cqb", "cqmin", "cqmax",
        ];
        for unit in units {
            assert_eq!(unit_type(unit), Some(DimensionType::Length), "{unit} should be Length");
        }
    }

    #[test]
    fn angle_units() {
        for unit in ["deg", "grad", "rad", "turn"] {
            assert_eq!(unit_type(unit), Some(DimensionType::Angle), "{unit}");
        }
    }

    #[test]
    fn time_units() {
        for unit in ["s", "ms"] {
            assert_eq!(unit_type(unit), Some(DimensionType::Time), "{unit}");
        }
    }

    #[test]
    fn frequency_units() {
        for unit in ["hz", "khz"] {
            assert_eq!(unit_type(unit), Some(DimensionType::Frequency), "{unit}");
        }
    }

    #[test]
    fn resolution_units() {
        for unit in ["dpi", "dpcm", "dppx", "x"] {
            assert_eq!(unit_type(unit), Some(DimensionType::Resolution), "{unit}");
        }
    }

    #[test]
    fn flex_unit() {
        assert_eq!(unit_type("fr"), Some(DimensionType::Flex));
    }

    #[test]
    fn unknown_unit() {
        assert_eq!(unit_type("xyz"), None);
        assert_eq!(unit_type(""), None);
    }
}
