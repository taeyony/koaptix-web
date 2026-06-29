"""Thin Busan 26350 Q4 wrapper for the generic MOLIT 2023 dry-run generator."""

from __future__ import annotations

import argparse
import sys

sys.dont_write_bytecode = True

from generate_molit_2023_raw_match_clean_pilot_payload import main as generator_main  # noqa: E402


BUSAN_26350_Q4_ARGS = [
    "--scope",
    "BUSAN_26350_2023_Q4",
    "--lawd-cd",
    "26350",
    "--start-date",
    "2023-10-01",
    "--end-date-exclusive",
    "2024-01-01",
    "--expected-raw-count",
    "629",
    "--source-package-sha256",
    "a8570fa0c38f28bd05051e3edde2d2642792c8565681252fe30f5da57db88d26",
    "--normalized-payload-package-sha256",
    "1ac2af74f69a28eeb797814acc9e489c2781ad2021c799bf6ca816cb1de26f3f",
    "--mapping-package-sha256",
    "46b997ea766bb7304e6c18f72ae3cb49a74361b0bf82c35262dc5ec22e978fcc",
    "--raw-selection-manifest-sha256",
    "DD6B0E396EF8011DF23D2B87368D687C0B498E1F41C6796E67E22F4E0343C33F",
    "--match-rule-version",
    "MOLIT_2023_MATCH_V2_LAWD_ALIAS_UNIQUE_P3_AREA",
    "--clean-rule-version",
    "MOLIT_2023_CLEAN_V2_COMPLEX_AREA_VALID_NONCANCELED",
    "--mode",
    "dry-run",
    "--no-output",
    "--expected-existing-match-rows",
    "0",
    "--expected-existing-clean-rows",
    "0",
    "--expected-unique-alias-candidate-count",
    "432",
    "--expected-unique-apt-complex-candidate-count",
    "0",
    "--expected-ambiguous-candidate-count",
    "13",
    "--expected-no-candidate-count",
    "184",
    "--expected-complete-complex-evidence-rows",
    "432",
    "--expected-area-cluster-resolvable-rows",
    "223",
    "--expected-potential-clean-rows",
    "223",
    "--expected-hold-review-rows",
    "406",
]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Run the approved Busan 26350 2023 Q4 MOLIT raw-match-clean dry-run "
            "with no output files."
        )
    )
    parser.add_argument(
        "--print-command",
        action="store_true",
        help="Print the delegated generic command arguments without running it.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.print_command:
        print(" ".join(["generate_molit_2023_raw_match_clean_pilot_payload.py", *BUSAN_26350_Q4_ARGS]))
        return 0
    return generator_main(BUSAN_26350_Q4_ARGS)


if __name__ == "__main__":
    raise SystemExit(main())
