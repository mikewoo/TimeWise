# Security Policy

## Reporting a vulnerability

If you find a security or privacy issue in TimeWise, please report it privately
first rather than opening a public issue.

- Use GitHub's **Report a vulnerability** feature (Security tab → Report a
  vulnerability) if enabled, or
- Open a minimal issue asking a maintainer to contact you, without disclosing
  details publicly.

Please include:

- A description of the issue and its impact.
- Steps to reproduce.
- The browser and extension version.

## Scope

TimeWise's core security promise is that it is **local-only**: no network
requests, no off-device data collection. Reports that are especially valued:

- Any code path that would transmit user data off the device.
- Any way page content (not just the tab's domain) could be read or leaked.
- Storage of sensitive data in a way other extensions or sites could access.

## What to expect

This is a small open-source project maintained on a best-effort basis. We'll
acknowledge valid reports and address them as quickly as is practical.
