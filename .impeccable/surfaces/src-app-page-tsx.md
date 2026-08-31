---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/globals.css","src/components/panel/SidebarPanelContent.tsx","src/components/panel/PointDetailSheet.tsx"]
---

## Scope and mode

- Surface: map workspace rooted at `src/app/page.tsx`
- Mode: Operate

## User job

Residents find a nearby collection point, understand whether its information is trustworthy, and contribute a verification or report without losing map context.

## Content and constraints

- Map exploration stays primary on desktop and mobile.
- Unverified and inaccurate locations remain discoverable with explicit status labels.
- Search, category filtering, location, registration, personal reports, detail, voting, review, report, and suggestion flows remain available.
- Korean labels, keyboard/back navigation, and mobile sheet behavior are preserved.

## Chosen direction

Citizen verification tally sheet: paper-toned surfaces, ink text, fine ledger rules, and green/amber/red reserved for trust state. Desktop reads as one continuous search rail, map field, and verification ledger. The memorable interaction is selecting a marker and seeing the trust tally become the third working column.

## Open decisions

- None for v1.0.
