### 2026-10-12, Agent B (new), T-04 cookie-banner-consent-minors-awareness
- **What changed:**
  - `frontend/src/components/CookieBanner.jsx` + CSS - Cookie banner component that only renders if `POLITICA_COOKIES.tieneCookiesNoEsenciales` is true. Reads from central legal config; stores consent in localStorage (educational/demo). Links to /legal/cookies. Includes disclaimer.
  - `frontend/src/App.jsx` - Wired CookieBanner component (renders before NetworkStatus/Routes)
- **How to verify:**
  - Banner does not show by default (tieneCookiesNoEsenciales=false per config). If enabled, would show with educational disclaimer.
  - Consent persists in localStorage key `cookie_consent_demo_educativo`.
- **Risks or decisions made:**
  - Implemented as conditional per audit (only if non-essential cookies exist). This matches amendment 4 (cookie banner only if non-essential cookies exist). 
  - Minors/guardian consent marked as relevant; noted in legal config (CONSENTIMIENTO). Full UI flows deferred to when forms touch aspirantes/alumnos data.
  - Accessibility: banner uses role="region" with aria-label; buttons have clear labels.
- **What I learned / why this matters:**
  - Consent UX must be proportional - don't show banner when not needed. Central config controls behavior.
- **Branch:** T-04-cookie-banner-consent-minors-awareness (local)
- **Commit:** fa72edb

- **Next:** Address external third-party requests priority (LandingPage FB/Maps/mailto/Gmail compose) - replace with demo placeholders or remove; improve accessibility (alt text, contrast, keyboard). Start T-05 (deletion request + retention table) after cleanup.
