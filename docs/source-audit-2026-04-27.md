# CaseSignal Source Audit

Date: 2026-04-27

## Scope

This audit checks the public-data assumptions in the CaseSignal brief:

1. Department of State Visa Bulletin
2. USCIS monthly filing-chart guidance
3. USCIS processing times
4. USCIS official APIs

The goal is to answer:

- Does the source already exist?
- Is there an official API?
- Is access practical for an MVP?
- What did the quick probes show?

## Executive Takeaways

- Yes, the core sources already exist.
- No, the Visa Bulletin does not appear to have an official public API.
- No, USCIS does not expose processing times in its official API catalog.
- Yes, the Visa Bulletin HTML pages are parseable enough for an MVP.
- Yes, the USCIS monthly filing-chart page is parseable enough for an MVP.
- Mixed on USCIS processing times: the site works in a browser, but simple scripted HTTP probes are blocked by Cloudflare.
- Strategic finding: for some I-130 preference categories, USCIS explicitly points users back to the Visa Bulletin and may not publish a useful processing-time estimate. That means Visa Bulletin logic should be primary for priority-date cases.

## Source 1: DOS Visa Bulletin

Official landing page:

- https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html

Observed behavior:

- The landing page is public and reachable.
- The latest monthly bulletin is published as HTML, not only PDF.
- Archived bulletins are also exposed as individual HTML pages.
- The page includes both:
  - Final Action Dates
  - Dates for Filing

Probe results:

- `HEAD` request to the May 2026 bulletin returned `HTTP/2 200`.
- Download of the May 2026 bulletin HTML succeeded.
- Quick extraction from the downloaded HTML found:
  - Family Final Action `F2A`: `01AUG24 / 01AUG24 / 01AUG24 / 01AUG23 / 01AUG24`
  - Family Filing `F2A`: `C / C / C / C / C`
  - Employment Final Action `2nd`: `C / 01SEP21 / 15JUL14 / C / C`

Assessment:

- Viability: High
- Best access path for MVP: scrape official HTML
- Risk: Low to moderate
- Main caveat: the table markup is not elegant, so the parser should be defensive

## Source 2: USCIS Monthly Filing-Chart Guidance

Official page:

- https://www.uscis.gov/green-card/green-card-processes-and-procedures/visa-availability-priority-dates/adjustment-of-status-filing-charts-from-the-visa-bulletin

Why it matters:

- DOS publishes both Final Action and Dates for Filing.
- USCIS decides which chart adjustment-of-status applicants should use in a given month.
- CaseSignal needs this if it wants to support filing-readiness logic, not just visa-current logic.

Observed behavior:

- Public page is reachable by direct HTTP request.
- The page is server-rendered enough to parse with basic HTML extraction.
- It includes current-month and next-month instructions.

Probe results from the live page downloaded on 2026-04-27:

- Current month:
  - Family-sponsored: use `Dates for Filing chart in the Department of State Visa Bulletin for April 2026`
  - Employment-based: use `Dates for Filing chart in the Department of State Visa Bulletin for April 2026`
- Next month:
  - Family-sponsored: use `Dates for Filing chart in the Department of State Visa Bulletin for May 2026`
  - Employment-based: use `Final Action Dates chart in the Department of State Visa Bulletin for May 2026`

Assessment:

- Viability: High
- Best access path for MVP: scrape official USCIS page monthly
- Risk: Low
- Product note: this source is not optional if "ready to file" is part of the output

## Source 3: USCIS Processing Times

Official tool:

- https://egov.uscis.gov/processing-times/

Observed behavior:

- A plain `curl` probe returned `HTTP/2 403`.
- Repeating the probe with a browser-like `User-Agent` still returned `HTTP/2 403`.
- In an actual browser session, the site passed Cloudflare verification and loaded successfully.
- The tool is interactive and requires:
  - Form
  - Form category
  - Office or service center

Functional browser probe:

- Selected `I-130 | Petition for Alien Relative`
- Selected category `Permanent resident filing for a spouse or child under 21`
- Selected office `Service Center Operations (SCOPS)`
- The site returned a result view and additional notes

Important business finding from USCIS notes:

- USCIS says SCOPS prioritizes I-130 preference petitions when the Visa Bulletin shows a visa is available or soon available.
- USCIS also says it does not post a processing time in most instances for Form I-130 preference category petitions.
- If the preference category is not current for a country, USCIS tells users to refer to the Visa Bulletin instead.

Assessment:

- Viability: Medium
- Best access path for MVP:
  - Manual browser-assisted lookup during pilot, or
  - Browser automation with session handling, if allowed
- Risk: High for fully unattended scraping
- Main caveat: direct scripted access is bot-protected

## Source 4: USCIS Official APIs

Official developer portal:

- https://developer.uscis.gov/
- API catalog: https://developer.uscis.gov/apis

Observed behavior:

- USCIS does have an official developer portal.
- The catalog currently shows:
  - Case Status API
  - FOIA Request and Status API

What we did not find in the official USCIS API catalog:

- Visa Bulletin API
- Processing Times API
- Filing-chart API

Assessment:

- Viability for CaseSignal MVP: Limited
- Strategic implication: official USCIS APIs are not the core path for the decision engine described in the brief

## MVP Recommendation

For the MVP, use a source strategy with three layers:

1. Primary source for priority-date logic
   - DOS Visa Bulletin HTML
2. Monthly adjustment rule source
   - USCIS filing-chart guidance page
3. Secondary operational source for time-based cases
   - USCIS processing times, but treat it as a fragile integration

## Suggested Decision Logic by Source

Priority-date cases:

- Base decision on DOS Visa Bulletin
- If the use case is "can file now?" also consult the USCIS monthly filing-chart page

Time-based cases:

- Use USCIS processing times where accessible
- Be prepared for gaps, bot friction, or form/category-specific caveats

## Risks

1. USCIS processing times are not reliably scriptable with naive HTTP requests.
2. USCIS may change markup, category labels, or office labels.
3. Some categories do not map neatly to a single universal rule.
4. The filing logic depends on both DOS data and USCIS monthly instructions, not just one source.

## Practical Next Step

Build the MVP in two phases:

1. Reliable core
   - Parse Visa Bulletin
   - Parse USCIS filing-chart guidance
   - Validate readiness and waiting logic for priority-date cases
2. Experimental layer
   - Add browser-assisted or semi-manual USCIS processing-time collection
   - Use it only for time-based case categories first

## Local Probe Script

See:

- `probes/parse_public_sources.py`

Example:

```bash
python3 probes/parse_public_sources.py \
  --uscis-filing-html /tmp/uscis_filing_charts.html \
  --visa-bulletin-html /tmp/visa_bulletin_may_2026.html
```
