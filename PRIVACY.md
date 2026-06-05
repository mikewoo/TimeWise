# Privacy Policy — TimeWise

_Last updated: 2026-06-05_

TimeWise is a browser extension that helps you understand your own focus and
attention while browsing. Privacy is its core design principle, not an
afterthought.

## The short version

**TimeWise does not collect, transmit, or sell any of your data. Everything
stays on your device.** TimeWise makes zero network requests.

## What data TimeWise processes

To compute your focus statistics, TimeWise reads, **locally and only on your
device**:

- The **domain** of your active tab (e.g. `github.com`) — never the full URL,
  page contents, form data, or anything you type.
- **Timing information**: how long a tab is active, and whether your system is
  idle (so idle time isn't miscounted as focus).
- **Your settings**: focus goal, custom category rules, and similar preferences.

## Where your data is stored

All of the above is stored **exclusively in your browser's local storage**
(IndexedDB and `chrome.storage.local`) on your own computer. It is never sent
anywhere.

- No remote servers. No cloud. No accounts. No sign-in.
- No analytics, telemetry, crash reporting, or advertising SDKs.
- No third parties receive any data.

## Data retention and deletion

- Events older than **90 days** are automatically deleted.
- You can export your data to CSV at any time from the dashboard.
- Uninstalling the extension removes all stored data. You can also clear it via
  your browser's site/extension data controls.

## Permissions and why they are needed

| Permission | Purpose |
|------------|---------|
| `tabs` | Read the active tab's **domain** to attribute focus time. The page's content and full URL are not accessed. |
| `storage` | Save your events and settings locally on your device. |
| `idle` | Detect when you step away, so idle time isn't counted as focus. |
| `alarms` | Periodically refresh the toolbar badge and run the local distraction check. |
| `notifications` | Show optional local "time check" reminders. |

TimeWise injects a small content script to display an occasional on-page prompt
("what were you doing?") after you return from being idle. This script does not
read page content; it only renders the prompt.

## Children's privacy

TimeWise is a general-purpose productivity tool and is not directed at children.
It collects no personal information from anyone.

## Changes to this policy

If this policy changes, the updated version will be published in the project
repository with a new "Last updated" date.

## Contact

Questions about privacy can be raised as an issue in the project repository:
https://github.com/mikewoo/TimeWise
