# Manual Steam CDP Verification Checklist

Generated for the SFP-style feasibility spike.

## Goal

Prove whether the official Steam desktop client Store page can be filtered by minimum discount percentage through a local CEF/CDP debugging target.

## Setup

1. Fully quit Steam from the tray menu.
2. Start Steam with `-cef-enable-debugging`.
3. Open the official Steam desktop client.
4. Navigate to Store > Specials or another sale-heavy Store page.
5. In this project, run:

```powershell
npm run probe:75
npm run watch:75
npm run ui
```

## Pass Criteria

- Output ends with `STATUS: applied`.
- `STEAM` is `debug_endpoint_found`.
- `TARGET` reports a Steam Store page title/url.
- `FILTER` reports nonzero `scanned` count.
- Cards below 75% are hidden in the official Steam desktop client Store page.
- Unknown cards with no recognizable discount percent are hidden and counted as `unknown`.
- In `watch:75` mode, opening or reloading a Steam Store page reapplies the filter without rerunning the command.
- Hidden games do not leave blank placeholder boxes in the visible sale/search list.
- In `ui` or exe mode, changing the threshold input and checkboxes updates the Steam Store page.
- No-discount, owned, and DLC products are hidden by default.

## Failure Evidence To Capture

- If `STATUS: blocked`, copy the full output.
- If `TARGET: store_missing`, confirm whether the Store page was open.
- If `STATUS: failed`, copy the `NEXT` line and current Steam Store URL/title.
- If filtering hides too much or too little, capture the page section and the `FILTER` counts.

## Stop Conditions

Stop the official Steam path and revisit the plan if success requires any of these:

- HTTPS certificate installation
- Credential/cookie interception
- Steam binary patching
- Hidden process injection
- Disabling Steam security behavior
