Two things I flagged but did not change, since both need a backend answer rather than a frontend guess:

- Possible double-rebase on base-currency change. BusinessCurrencyForm.tsx:299-302 divides every rate by the new base's rate client-side, then the BFF also calls /currencies/{code}/base. If your backend's setBaseCurrency normalizes rates too, they get divided twice. Worth testing with three currencies configured.
- The BFF PUT is a non-atomic fan-out of N calls with no rollback. Partial failure leaves a half-applied config.

Also: api-docs/api.json shows as modified in git — your editor reformatted it while it was open. I confirmed it's whitespace-only (the parsed JSON is identical) and left it untouched.
