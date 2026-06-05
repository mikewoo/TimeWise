# Chrome Web Store Listing

Copy-paste source for the TimeWise store listing. Keep this in sync with the
extension when fields change.

---

## Product name

```
TimeWise — Your Browser Time Cardiogram
```

## Short description (max 132 chars)

```
A privacy-first focus tracker. See your deep-focus streaks and golden hours — 100% local, zero network requests.
```

## Category

`Productivity`

## Language

English (primary) · Chinese (Simplified)

---

## Detailed description

```
TimeWise turns your browsing into a "flow cardiogram" — a calm, visual picture
of when and how you focus, without sending a single byte off your machine.

WHAT YOU GET
• Flow cardiogram — your longest unbroken focus streak, spanning multiple tools
• Golden focus hours — a 7-day heatmap of when your deep focus actually peaks
• Daily & weekly app rankings, color-coded by category
• Daily focus goal tracking
• Weekly micro-experiments tailored to your real patterns
• Light & dark themes that follow your system
• CSV export — your data is yours
• English and 简体中文

PRIVACY BY DESIGN
TimeWise makes ZERO network requests. Everything is stored locally in your
browser. No accounts, no telemetry, no analytics, no cloud. Events older than
90 days are auto-pruned. You can verify all of this — the full source is open
at github.com/mikewoo/TimeWise.

ABOUT PERMISSIONS
TimeWise reads only the DOMAIN of your active tab (e.g. github.com) to measure
focus — never page contents or full URLs. The "tabs" permission may show a
"read your browsing history" prompt at install; TimeWise only uses it locally
for focus stats and never transmits anything.
```

---

## Privacy practices (Developer Dashboard form)

**Single purpose:**

```
TimeWise measures how you focus while browsing and visualizes it locally, to
help you understand and improve your own deep-work habits.
```

**Privacy policy URL:**

```
https://github.com/mikewoo/TimeWise/blob/main/PRIVACY.md
```

**Data usage declarations:** TimeWise does NOT collect or transmit any user
data. When filling the form, declare that no data is collected or sold, and
that no data leaves the user's device.

---

## Permission justifications (Developer Dashboard form)

The dashboard asks you to justify each requested permission. Paste these:

**`tabs`**

```
Used to read the domain of the active tab (e.g. github.com) so focus time can
be attributed to a site. The page's content and full URL are never accessed,
and nothing is transmitted off the device.
```

**`storage`**

```
Used to save the user's focus events and settings locally in the browser. No
data is sent to any server.
```

**`idle`**

```
Used to detect when the user steps away so idle time is not miscounted as
focus, keeping the statistics accurate.
```

**`alarms`**

```
Used to periodically refresh the toolbar badge and run a local "distraction
check" on a schedule.
```

**`notifications`**

```
Used to show optional local "time check" reminders when the user lingers on a
distracting site. Reminders are generated on-device.
```

**Host permission / broad match (`content_scripts` on `<all_urls>`)**

```
TimeWise injects a small content script that displays an occasional on-page
prompt ("what were you doing?") after the user returns from being idle, so a
short away period can be labeled. The script runs on any site because focus can
happen anywhere, but it only renders the prompt — it does not read, collect, or
transmit page content.
```

