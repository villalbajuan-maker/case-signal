#!/usr/bin/env python3
"""
Minimal parser probes for CaseSignal public sources.

These probes avoid external dependencies and operate on local HTML snapshots.
They are meant to validate whether the main public sources are parseable enough
for an MVP, not to be production-ready scrapers.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_uscis_filing_chart_rules(html: str) -> Dict[str, str]:
    compact = normalize_space(html)
    result: Dict[str, str] = {}

    current_block_match = re.search(
        r"Current Month’s Adjustment of Status Filing Charts</h2>(.*?)"
        r"<h2>Next Month’s Adjustment of Status Filing Charts</h2>",
        compact,
    )
    next_block_match = re.search(
        r"Next Month’s Adjustment of Status Filing Charts</h2>(.*?)"
        r"<h2>Previous Adjustment of Status Filing Charts</h2>",
        compact,
    )

    def extract_charts(block: str, prefix: str) -> None:
        family_match = re.search(
            r"For all family-sponsored preference categories, you must use the "
            r"<a [^>]*>([^<]+)</a>\.",
            block,
        )
        employment_match = re.search(
            r"For all employment-based preference categories, you must use the(?:&nbsp;|\s)*"
            r"<a [^>]*>([^<]+)</a>\.",
            block,
        )
        if family_match:
            result[f"{prefix}_family_chart"] = family_match.group(1)
        if employment_match:
            result[f"{prefix}_employment_chart"] = employment_match.group(1)

    if current_block_match:
        extract_charts(current_block_match.group(1), "current")
    if next_block_match:
        extract_charts(next_block_match.group(1), "next")
    return result


def extract_table_rows(html: str, marker: str) -> List[List[str]]:
    start = html.find(marker)
    if start == -1:
        return []

    table_start = html.find("<table", start)
    table_end = html.find("</table>", table_start)
    if table_start == -1 or table_end == -1:
        return []

    table_html = html[table_start : table_end + len("</table>")]
    row_matches = re.findall(r"<tr>(.*?)</tr>", table_html, flags=re.S)
    rows: List[List[str]] = []
    for row_html in row_matches:
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row_html, flags=re.S)
        cleaned = [normalize_space(re.sub(r"<[^>]+>", " ", cell)) for cell in cells]
        if cleaned:
            rows.append(cleaned)
    return rows


def extract_visa_bulletin_samples(html: str) -> Dict[str, List[str]]:
    family_final = extract_table_rows(
        html, "FINAL ACTION DATES FOR&nbsp;FAMILY-SPONSORED&nbsp;PREFERENCE CASES"
    )
    family_filing = extract_table_rows(
        html, "DATES FOR FILING FAMILY-SPONSORED&nbsp;VISA APPLICATIONS"
    )
    employment_final = extract_table_rows(
        html, "FINAL ACTION DATES FOR&nbsp;EMPLOYMENT-BASED&nbsp;PREFERENCE CASES"
    )
    employment_filing = extract_table_rows(
        html, "DATES FOR FILING OF EMPLOYMENT-BASED&nbsp;VISA&nbsp;APPLICATIONS"
    )

    def find_row(rows: List[List[str]], label: str) -> List[str]:
        for row in rows:
            if row and row[0] == label:
                return row
        return []

    return {
        "family_final_f2a": find_row(family_final, "F2A"),
        "family_filing_f2a": find_row(family_filing, "F2A"),
        "employment_final_2nd": find_row(employment_final, "2nd"),
        "employment_filing_2nd": find_row(employment_filing, "2nd"),
        "employment_final_3rd": find_row(employment_final, "3rd"),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--uscis-filing-html", type=Path)
    parser.add_argument("--visa-bulletin-html", type=Path)
    args = parser.parse_args()

    output: Dict[str, object] = {}

    if args.uscis_filing_html:
        output["uscis_filing_chart_rules"] = extract_uscis_filing_chart_rules(
            args.uscis_filing_html.read_text(encoding="utf-8")
        )

    if args.visa_bulletin_html:
        output["visa_bulletin_samples"] = extract_visa_bulletin_samples(
            args.visa_bulletin_html.read_text(encoding="utf-8")
        )

    print(json.dumps(output, indent=2, ensure_ascii=True))


if __name__ == "__main__":
    main()
