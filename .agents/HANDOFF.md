### 2026-10-12, Agent B (new), T-01 central-legal-config
- **What changed:** 
  - `frontend/src/config/legal.js` - Central legal config with educational templates (Aviso de Privacidad, Términos, Política de Cookies, Retención/Eliminación, Consentimiento). All values are fake demo placeholders (example.com domains, [PENDIENTE: ...]), marked as "Plantilla educativa. Requiere revision legal antes de uso real."
  - `backend/src/config/legal.js` - Backend counterpart for emails/documents.
- **How to verify:**
  - Files exist and are readable: `ls frontend/src/config/legal.js backend/src/config/legal.js`
  - No real data found: grep confirms only example.com and placeholders
  - Config loads without errors (ES modules)
- **Risks or decisions made:**
  - Created central single-source config as per amendment 1. Chose explainable structure with WHY notes in comments per section (educational approach).
  - Retention policy explicitly documented as assumptions (amendment 4). Cookie banner disabled by default since no non-essential cookies detected yet (will be enabled if found).
  - Minors/guardian consent flagged as relevant due to aspirantes/alumnos domain.
- **What I learned / why this matters:**
  - Centralizing legal text prevents drift and makes production swap trivial. 
  - Educational templates with explanatory comments help understand legal concepts (LFPDPPP principles, ARCO, retention minimization) while respecting "no real data". 
  - Separating frontend/backend legal configs keeps concerns clean.
- **Branch:** T-01-central-legal-config (local, not pushed)
- **Commit:** a5f14f9

- **Next:** T-02-compliance-audit-scan (Phase A) to mark applies/doesn't apply for payments/refunds/fees/testimonials/cookies/minors/unsubscribe/deletion/external requests/accessibility. Then create legal pages + wire footer.
