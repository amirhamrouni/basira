# BASIRA engineering invariants

These rules are mandatory for every future BASIRA change. They exist because regressions have already reached production when later commits silently restored older behavior.

## Palm reading invariant

- A genuine visible human palm is always a valid palm-reading input, even when fine lines are faint, cropped, dim, or unevenly lit.
- Return `ERROR_NOT_A_PALM` only when no human palm is visible or the image is unusable.
- Never restore `ERROR_PALM_LINES_UNREADABLE` as a user-facing rejection path.
- When detail is limited, complete a limited reading from genuinely visible major lines, contours, proportions, mounts, branches, or intersections. Never invent a mark.
- Keep the selected palm photo preview unfiltered. Do not restore dark blend/opacity filters that hide line detail.
- The regression fix baseline is commit `e0ede8b39fcb1ff633f3554fee3f5793e7bccbe0`.

## Reading access and monetization

- Palm and coffee readings have exactly 3 free readings per type for non-premium accounts.
- After the free allowance, a non-premium reading costs 15 Energy.
- `vipStatus` values `adept` and `oracle` are server-controlled premium entitlements and must not spend Energy in `saveMeteredReading`.
- Clients must never grant themselves `vipStatus`.
- Rewarded-ad UI must never simulate ad completion with timers or animations. Grant an ad reward only after the native Google Mobile Ads rewarded callback confirms it was earned.
- Debug builds may use Google's official sample AdMob application ID and rewarded unit ID.
- Release builds must fail if real `ADMOB_APP_ID` and `ADMOB_REWARDED_AD_UNIT_ID` values are missing.
- UMP consent status must be refreshed before requesting ads. Do not bypass consent failures by assuming cached consent is valid unless `ConsentInformation.canRequestAds()` explicitly permits requests.
- Before production monetization, harden Energy rewards with server-side rewarded-ad verification. A client callback alone is functional but not sufficient as an anti-fraud trust boundary.

## Release discipline

- Do not commit directly over a known-good production baseline for risky changes. Use a branch and pull request.
- Before merge, require `npm run check`, Android structure verification, and a real Android Gradle build when native code changes.
- Never merge a change that makes the palm regression test fail or removes the visible-palm acceptance guard.
- Never claim an APK is production-ready until its signing certificate and SHA-256 have been verified.
