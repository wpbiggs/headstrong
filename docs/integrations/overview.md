# Integrations Overview

Headstrong uses a contracts-first integration model.

## Principles

- Integration packages depend on typed contracts from `@headstrong/core/integrations`.
- Feature flags gate every provider/consumer path before rollout.
- No integration package depends on UI or quest/social implementation details.

## Packages

- `packages/integrations/lti`
  - LTI 1.3 provider/consumer scaffolding
  - OIDC login initiation and callback stubs
- `packages/integrations/rostering`
  - Clever and ClassLink roster sync contracts
- `packages/integrations/google-classroom`
  - course and assignment sync contracts
- `packages/integrations/open-badges`
  - JSON-LD friendly badge assertion issuance contract

## Rollout path

1. Keep all feature flags disabled by default.
2. Validate contract shapes in tests.
3. Wire local or sandbox-only handlers.
4. Add real auth, signing, and network interactions later behind the same contracts.

## Feature flags

- `ENABLE_LTI_PROVIDER`
- `ENABLE_LTI_CONSUMER`
- `ENABLE_CLEVER_ROSTERING`
- `ENABLE_CLASSLINK_ROSTERING`
- `ENABLE_GOOGLE_CLASSROOM`
- `ENABLE_OPEN_BADGES`
