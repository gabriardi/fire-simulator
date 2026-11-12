# Security

When can I stop? is a static site: files served as they are, with no server code, no accounts and
no database. What there is to protect is what people type in, their plans, and that stays in
their browser. This page says how the site protects it, what it can't protect, and how to report
a problem.

## Reporting a problem

Please report it privately, not in a public issue:

- on GitHub, with **Report a vulnerability** under the repository's _Security_ tab;
- or by email, to [privacy@whencanistop.fyi](mailto:privacy@whencanistop.fyi).

Say what you found, and how to see it happen. The live site (whencanistop.fyi) and the `main`
branch are what gets fixed.

## What the site does

- **It loads nothing from elsewhere.** The Content-Security-Policy in `site/_headers`:

  ```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
  font-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'none'; frame-ancestors 'none'
  ```

  No inline or third-party script runs. Inline styles are allowed because the chart library sets
  them. The chart library is served with the site, and CI checks that it is, byte for byte, the
  file published on npm for its version. Other headers: `Referrer-Policy: no-referrer`,
  `X-Content-Type-Options: nosniff`, a `Permissions-Policy` that turns off the camera, the
  microphone, location, payments and USB, and `Strict-Transport-Security`: after one visit,
  browsers use only https for the site, for 180 days.

- **Every plan from outside is untrusted.** Plans from local storage, a file or a share link go
  through `normalize()` (`site/js/plan.js`): every field gets its type and a value within bounds,
  unknown fields are dropped, and references point at people who exist. A plan made by a newer
  version of the site isn't opened: the page asks for a reload.
- **Names are text.** Plan, person and account names are put on the page as text, never as HTML,
  and escaped in the chart labels. The only HTML the page inserts is its own help text
  (`site/js/locales/en/help.js`).
- **Share links stay out of requests.** The plan is after the `#`, which browsers don't send to
  the server, and the page removes it from the address bar once opened.
- **The service worker** answers only the site's own `GET` requests, and keeps only the site's
  own files. It asks the network first, except for the chart library, whose file name carries its
  version. A page left open checks for a new version and loads it, so a fix reaches installed
  apps too (`site/js/ui/updates.js`).

## Share links: the format

The code after `#plan=` is one of:

- `z…`: the plan, its name and the run it was shared with, as JSON, deflated (`deflate-raw`),
  in base64url;
- `j…`: the same, not compressed, from browsers without `CompressionStream`;
- `e…`: locked with a password, base64url of `[version: 1 byte][salt: 16][iv: 12][AES-GCM]`.
  - The key is AES-256, from the password by PBKDF2-SHA256 with 600,000 iterations and the
    random salt. The password is first normalised to Unicode NFC, so that it gives the same bytes
    on every device.
  - The version byte is authenticated (AES-GCM's additional data). What's encrypted is the
    letter `z` or `j` and the bytes an unlocked link would carry, so the plan's name is
    encrypted too.
  - The page asks for at least 8 characters. A wrong password and a damaged link can't be told
    apart: AES-GCM only says the data doesn't open.

A later change of the iterations or the cipher needs a new version byte (`LOCK` in
`site/js/store.js`), and `unpackPlan` has to keep reading the old one, or links already sent stop
opening.

## What it can't protect

- **An unlocked share link is readable by anyone who has it.** The page says so where the link
  is made.
- **A locked link can be attacked offline**, by trying passwords as fast as the attacker's
  hardware allows. PBKDF2 slows each try; the password's length does the rest. A few unrelated
  words are better than a short password.
- **Plans in local storage** can be read by anyone who can use the browser, and by browser
  extensions allowed on the site. An exported file is as private as wherever it's kept.
- **The host serves the code.** Whoever controls the site's Cloudflare account, or the host
  itself, could serve different code, as with any web app. The code is public, so what the site
  should be serving can be checked.
- **Copies elsewhere** may run without these headers: GitHub Pages ignores `site/_headers`.
