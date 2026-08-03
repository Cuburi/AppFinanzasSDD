# Slice 6 Browser Evidence

## Stable test contract

`client/e2e/monthly-ledger.spec.ts` intercepts every `/api/**` request with a fixed active month, empty support collections, and canonical entries `system-a`, `expense-b`, `system-c`. It never starts the API, database, or a personal profile.

## Chromium checks

- At 320 CSS pixels, the test asserts `html.scrollWidth <= html.clientWidth` and preserves canonical DOM order `system-a`, `expense-b`, `system-c`.
- The first automatic-event disclosure is programmatically focused and expanded with Enter; the other disclosure is opened independently.
- After both disclosures expand, every ledger button measures at least 44 CSS pixels high.
- The focused disclosure has the token-backed focus box shadow; the browser screenshot is stored as `focused-disclosure-320.png`.
- The 200% reflow check uses Playwright's 640 CSS-pixel viewport: half the `Desktop Chrome` project's 1280 CSS-pixel baseline. This changes the layout viewport and therefore evaluates responsive CSS; it is not DevTools page-scale magnification.
- Before its post-reflow measurements, the 200% check expands both automatic-event disclosures and asserts both automatic descriptions are rendered.
- At that reflow viewport, it asserts `window.innerWidth === 640`, `visualViewport.scale === 1`, `html.scrollWidth <= html.clientWidth`, and that all three `[data-ledger-item]` rectangles have `left >= 0` and `right <= window.innerWidth`.

## 200% reflow record

`active-month-200pct.png` is a full-page Chromium capture from the 640 CSS-pixel reflow test after both disclosures expand. Its 640-pixel width is the complete tested viewport width; the screenshot visibly includes the expanded canonical ledger entries, while the automated rectangle and overflow assertions establish that those entries are not horizontally clipped.

## Commands

```sh
pnpm --dir client test:e2e
pnpm --dir client exec playwright install chromium
```
