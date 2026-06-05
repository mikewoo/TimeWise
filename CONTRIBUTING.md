# Contributing to TimeWise

Thanks for your interest! TimeWise is a small, dependency-light Chrome extension,
so getting started is quick.

## Ground rules

TimeWise has one non-negotiable principle: **it never makes network requests and
never collects user data off-device.** Any contribution that adds telemetry,
analytics, remote logging, or external API calls will not be accepted. Keep it
100% local.

## Local setup

No build step is required to run the extension:

1. Fork and clone the repo.
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select the repo root (the folder with `manifest.json`).
4. After editing files, click the reload icon on the extension card, then reopen
   the dashboard. For UI changes, also refresh any open dashboard tab.

## Project layout

See the Architecture section in [README.md](README.md). In short: `background.js`
is the service worker, `lib/` holds the tracking/classification/aggregation logic,
and `ui/` is the dashboard and settings pages. It's vanilla JS — no framework.

## Style

- Match the surrounding code: vanilla ES modules, no new dependencies unless
  truly necessary (and never anything that ships network code).
- Keep comments meaningful — explain *why*, not *what*.
- UI colors go through the CSS design tokens in `ui/dashboard.html` so both light
  and dark themes stay consistent.
- Strings are localized via `_locales/en` and `_locales/zh_CN` — add both.

## Submitting changes

1. Create a branch off `main`.
2. Make focused, atomic commits.
3. Test by loading the unpacked extension and exercising the affected feature.
4. Open a pull request describing what changed and how you verified it.

## Reporting bugs

Open an issue with: what you did, what you expected, what happened, and your
browser version. Screenshots of the dashboard help.
