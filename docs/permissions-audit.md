# Permissions & roles audit — frontend, backend, Keycloak

Audited 2026-08-22 against `bo-frontend`, `ite-sb-api`, and the live realm
`istad-fluxipos-auth` at auth.chanchhay.site (read-only; no changes made).

## Verdict on the model

The design is correct, and it is not really the alternative to the "realm roles
as permissions + groups" approach — it is the same idea with the better
primitive at each layer:

| Layer | What it is | Where |
|---|---|---|
| Atomic permission | client role on `fluxipos-backend`, e.g. `item:create` | 55 roles, one per `PermissionCode` |
| Named role | **realm** role `biz_<businessId>_<slug>`, composite of the above | `KeycloakRoleAdapter` |
| Assignment | the composite realm role is added to the user | `StaffManagementService.assignRoles` |
| Enforcement | `resource_access["fluxipos-backend"].roles` → `SCOPE_*` authorities | `SecurityConfig` |

Client roles for the atomic permissions keep the realm namespace clean and let
the resource server own its vocabulary. Composite roles are the idiomatic
Keycloak tool for bundling permissions; Groups organise *users*, and per-business
roles would force a second hierarchy. Keep it.

The three sources of the vocabulary agree exactly: **55 permissions** in the
backend `PermissionCode` enum, 55 in the frontend catalog, all 55 present as
Keycloak client roles. No drift.

---

## P0 — Two "Cashier" roles grant Keycloak realm administration

`biz_9efe3277-afb7-4696-a2ba-7e963ad8875e_cashier` and
`biz_9b0f2d61-f813-4a2b-9bd6-e28de4d4ae92_cashier` each have **all 55**
permissions plus **9 roles from Keycloak's own `realm-management` client**:

```
realm-admin, manage-users, manage-realm, manage-clients,
manage-authorization, manage-identity-providers, impersonation,
view-users, create-client
```

**5 enabled users hold this today**: `cashier`, `coko`, `dararatana`,
`jingko`, `phakleydevops`. Each can sign into the Keycloak admin console,
create and read every user in the realm (206 users), impersonate any account
including business owners, and reconfigure the realm.

This did not come from the API — `KeycloakRoleAdapter.internalUpdateRolePermissions`
validates every requested permission against `PermissionCode` and only ever pulls
composites from the `fluxipos-backend` client. It was done by hand in the Keycloak
console, almost certainly by selecting all available roles when building the role.

**Fix:** remove the 9 `realm-management` composites from both roles. Then treat
console-side role editing as forbidden — the API is the only safe path, because
it is the only one that validates.

## P0 — Any authenticated user can read any business's data

`BusinessSecurityValidator` is the only tenant check in the codebase, and only
three controllers call it: `BusinessRoleController`, `BusinessStaffController`,
`FacebookConnectController`. The other 24 business-scoped controllers — items,
orders, item-groups, stock, currencies, customers, discounts, coupons,
membership types, sales reports, channel pricing, add-ons, assets — take
`{businessId}` from the URL and trust it.

`SecurityConfig` cannot close this: it matches `/api/v1/businesses/*/orders` and
checks `SCOPE_order:read`, but that permission is global to the user, not bound
to a business.

The chain is reachable from the open internet:

1. `POST /api/v1/auth/register/customer` is `permitAll()`.
2. It grants `USER` + `GLOBAL_CUSTOMER` (`AuthServiceImpl:154`).
3. `GLOBAL_CUSTOMER` composites include `order:read`, `order:cancel`, `order:pay`.
4. `GET /api/v1/businesses/{anyId}/orders` needs only `SCOPE_order:read`, and
   `OrderController` performs no tenant check.

So a self-registered stranger can read — and cancel — every business's orders.
A self-registered *business* account holds `BUSINESS` (40 permissions) and can
additionally read every business's items, customers, currencies and discounts.

*Established from the code and from role composites read out of Keycloak. Not
tested against the running API — that would mean attacking live data.*

**Fix:** the data is already there. `StaffManagementService.saveUserProfile`
sets `profile.setBusiness(business)`, so every staff member is bound to a
business in the database. Add a `validateBusinessAccess(UUID businessId)` that
passes when the caller owns the business *or* their `UserProfile.business`
matches, and call it from every controller taking `{businessId}` — ideally from
a `HandlerInterceptor` or an `@BusinessScoped` annotation so a new controller
cannot forget it. Also note `validateBusinessOwner` is owner-only, so staff
currently cannot list roles or other staff even within their own business,
despite holding `role:read` / `member:read`.

## P1 — Access tokens live for 24 hours

`accessTokenLifespan = 86400` (default is 300). A permission removed from a role
stays effective for up to a day, and a leaked token is valid just as long.
Set it to 300–900s; refresh tokens already work (`use.refresh.tokens: true`).

## P1 — Realm hardening

- `bruteForceProtected: false` with the master admin at **admin/admin** on a
  public host. Change the password and enable brute-force protection.
- `registrationAllowed: true` — self-registration is open, which is what makes
  the tenancy gap above reachable anonymously. Intentional? If not, disable it.

## P2 — Storefront rules are shadowed in SecurityConfig

The Business block comes first and matches a single path segment:

```java
.requestMatchers(GET, "/api/v1/businesses/*").hasAuthority("SCOPE_business:read")
.requestMatchers(PUT, "/api/v1/businesses/*").hasAuthority("SCOPE_business:update")
```

`/api/v1/businesses/storefront` is one segment, so it is caught here and the
later Storefront rules never run. Result: `GET /businesses/storefront` requires
`business:read` while `GET /businesses/storefront/slug` requires
`storefront:read`. Move the Storefront block above the Business block.

## P2 — A stray `SCOPE_item:update` client role exists

Someone created a Keycloak client role literally named `SCOPE_item:update` —
the Spring authority string, not the permission. It is a composite of both
Cashier roles. It grants nothing (it would map to `SCOPE_SCOPE_item:update`),
so those cashiers appear to have item editing and get 403. Delete the role.

## P2 — The permission catalog is not exposed over HTTP

`PermissionCode` is referenced only inside `KeycloakRoleAdapter`; nothing serves
it. The frontend therefore mirrors all 55 entries plus both assignability flags
by hand. Add `GET /api/v1/permissions` returning code, display name, group and
the two flags, and the frontend can drop the mirror.

---

## Keycloak — applied

Read-only backup of both roles taken first (composites, ids and all).

- Removed **30 contaminating composites** from each of
  `biz_9efe3277-…_cashier` and `biz_9b0f2d61-…_cashier`, leaving exactly the 55
  real permissions. Gone: all 18 `realm-management` roles (`realm-admin`,
  `manage-users`, `manage-realm`, `impersonation`, …), the 8 `account` roles and
  `read-token` (all still granted to everyone via `default-roles`, so no user
  lost anything real), plus `uma_protection` and `SCOPE_item:update`.
- Deleted the stray `SCOPE_item:update` client role.
- Verified after: both roles hold 55 composites and no non-permission role; the
  five users' effective `realm-management` mappings dropped to `create-client`
  alone.

**Still open, and blocked.** Two Keycloak items remain, and the sandbox stopped
allowing admin-API calls partway through — reads included — so they could not
be applied:

1. **`create-client` sits in the realm's `default-roles`**, so all 206 users
   hold it, including every self-registered customer. Not stock Keycloak; it
   lets any account create OIDC clients in the realm. Remove it from
   `default-roles-istad-fluxipos-auth`'s composites.
2. **`accessTokenLifespan` is 86400** (24h; default 300). Suggest 900. Refresh
   tokens are enabled and `ssoSessionIdleTimeout` is 3 days, so sessions
   survive; this is what makes a removed permission take effect promptly
   instead of up to a day later.

Both are single changes in the Keycloak admin console under Realm settings →
Sessions/Tokens and Realm roles → default-roles.

## Backend — applied (SecurityConfig only, no controller touched)

New `config/security/BusinessAccessAuthorizationManager`, an
`AuthorizationManager<RequestAuthorizationContext>` that reads `{businessId}`
from the matched path and grants only the business's owner
(`Business.keycloakUserId`) or its active staff
(`UserProfile.business` + `staffStatus = ACTIVE`). `SecurityConfig` pairs it
with the existing permission check through `AuthorizationManagers.allOf`, so
`item:read` now says the caller may read items *and* whose.

- Every business-scoped matcher changed from `"/businesses/*/…"` to
  `"/businesses/{businessId}/…"` — the variable must be named or the manager
  has nothing to read. 53 rules.
- Added a final `"/businesses/{businessId}/**"` catch-all so discounts,
  coupons, customers, membership types, add-ons, assets, sales reports and
  channel pricing — which have no `PermissionCode` and were falling through to
  `anyRequest().authenticated()` — are at least confined to the business's own
  people.
- **Ordering is load-bearing and tested.** `{businessId}` happily captures the
  literal segment `storefront`, so the catch-all matches
  `/businesses/storefront` too and would deny it. The storefront, telegram and
  bakong rules are therefore listed *before* it. `catchAllAlsoMatchesTheSettingsPaths_soOrderingIsLoadBearing`
  pins this down.

Four further bugs fixed in the same file:

| Bug | Was | Now |
|---|---|---|
| Storefront rules shadowed by `GET/PUT /businesses/*` | `/businesses/storefront` needed `business:read` | needs `storefront:read` |
| `PUT /businesses/{id}/delete` had no rule (controller maps PUT, config matched POST) | deleting a business needed only `business:update` | needs `business:delete` |
| `DELETE /businesses/{id}/logo` and `/thumbnail` had no rule | any authenticated user | `business:update` + membership |
| `bakong-setting:preview` mapped to `/bakong/preview` | controller maps `/bakong/preview-qr`, so the permission was unreachable | mapped to `/preview-qr` |
| `DELETE /social-settings/telegram-bot` had no rule | any authenticated user | `telegram-setting:update` |

**`BusinessSecurityValidator` no longer means owner-only.** It accepted the
owner alone, which contradicted `PermissionCode`: that enum marks
`member:manage`, `member:read` and every `role:*` as `businessStaffAssignable`,
so an owner could grant a manager the right to administer staff and roles and
then watch the request refused inside the controller. It now accepts the owner
or *active* staff. Authority still comes from the permission, which
`SecurityConfig` checks first; this only answers whose business. The old method
name is kept as a deprecated delegate so no controller had to change.

**Facebook settings needed rules of their own.** `FacebookConnectController`
declares full paths on its methods with no class-level `@RequestMapping`, so it
hides from a naive sweep. Its `/businesses/social-settings/facebook` routes
would have been claimed by the `{businessId}` catch-all and denied. Both those
and the `{businessId}/social/facebook` variants are now mapped to
`business:read` / `business:update` — matching the dashboard's Facebook Page
screen. Without the id-addressed rules, relaxing the validator above would have
let any staff member disconnect the page.

Verified: `./gradlew test` green, **15 tests, 0 failures**. That includes
`IteSbApiApplicationTests`, which boots the entire bean graph — so every one of
the 60-odd matchers parses and `BusinessAccessAuthorizationManager` really does
wire into the filter chain. The rest cover path-variable capture, owner, active
staff, another business's staff, suspended staff, a matcher with no variable, a
malformed id, and an unknown business.

**Behaviour change to verify:** a `GLOBAL_CUSTOMER` can no longer `POST
/api/v1/businesses/{id}/orders` directly. The customer app uses
`/api/v1/storefront/checkout` throughout (`ipos-frontend/src/features/checkout/checkoutApi.ts`),
and the Telegram and Facebook checkouts run server-side, so nothing observed is
affected — but worth a pass through ordering before deploying.

**Not done, deliberately:** `GET /api/v1/permissions`, which would let the
frontend stop mirroring the 55 permissions by hand. It needs a new controller,
and the brief was security-config-only. It is a convenience, not a fix — the
mirror is currently exact and verified.

## Staff accounts could not load a single screen

Reported after the work above; **pre-existing**, and the mirror image of the
cross-tenant bug. `SecurityConfig` was letting the wrong people in; the service
layer was keeping the right people out.

`GET /api/v1/businesses/me` resolved the caller's business with
`businessRepository.findByKeycloakUserId(...)` — a business the caller *owns*.
Staff own none, so it answered 404 "Business has not been found". The dashboard
resolves every other business id through that one call
(`getCurrentBusinessId()` in `src/lib/api/business-backend.ts`), so a single
404 emptied the entire application for a staff account.

Behind it sat a second layer. `BusinessHelper` offers two resolvers:

| | Accepts | Call sites |
|---|---|---|
| `findOwnedBusiness` / `findOwnedBusinessOrNotFound` | owner only | ~90 |
| `findAccessibleBusiness` | owner or active staff | 13 |

Only orders, add-ons, presets, units and the customer display used the correct
one. Items, currencies, stock, customers, discounts, coupons, membership types,
channel pricing and assets all used owner-only, so even with the id fixed a
staff member would have met 403 everywhere.

Fixed:

- `BusinessHelper.currentBusiness()` / `currentBusinessOrEmpty()` — owner by
  ownership, staff by the `UserProfile.business` that `StaffManagementService`
  already writes. `getMyBusiness()` and the "my settings" resolvers in
  storefront, telegram, bakong, facebook and sales channels now use it, instead
  of each repeating the same owner-only lookup.
- `findOwnedBusiness` and `findOwnedBusinessOrNotFound` now delegate to
  `findAccessibleBusiness`, deprecated with the reasoning. That fixes all ~90
  call sites at once without editing them.
- `RegisterSessionServiceImpl` already did this correctly — it was the one place
  that fell back to `UserProfile.business`. Left alone.

**This loosens nothing.** Authority comes from the permission, which
`SecurityConfig` checks first; these resolvers only establish that the caller
belongs to the business. The two genuinely owner-only operations — creating and
deleting a business — are held back by `PermissionCode`, which marks
`business:create` and `business:delete` as not assignable to business staff, so
no staff role can carry them. The enum was already the right place for that
decision.

`./gradlew test`: **21 tests, 0 failures**, including the full context boot.

### The error message was pointing the wrong way

`ProfileQueryError` printed "Check the server's `API_BASE_URL` value and the
backend availability" unconditionally — including when the backend had answered
perfectly clearly with "Business has not been found". That hint now shows only
when the request got no answer at all (`hasApiErrorMessage` in
`src/lib/api-error.ts`); when the server spoke, its own words stand alone.

## Frontend changes made

One permission vocabulary, gated on the Keycloak names directly.

- `permission-catalog.ts` is now the single typed source. `as const satisfies`
  derives `Permission` as a union of the 55 real names, so a typo in a gate is a
  build error rather than a menu that silently disappears.
- Deleted from `permissions.ts`: the parallel `PERMISSIONS` vocabulary, the
  hardcoded `ROLE_PERMISSIONS` table, and the `permissionsForRoles` translation
  layer. 163 lines → 40.
- **Fixed a UI privilege escalation.** `ROLE_PERMISSIONS` matched any role name
  case-insensitively, so a business-created role named `Admin` or `Manager` was
  granted every permission in the sidebar. Live data contains exactly such roles
  (`biz_..._admin`, `biz_..._manager`).
- **Fixed empty sidebars.** `storefront`, `telegram-setting`, `profile` and all
  `admin-*` permissions had no entry in the translation map, so a platform
  admin holding only `admin-*` roles saw no navigation at all.
- **Fixed 4 unsaveable permissions.** The role editor offered `business:create`,
  `business:delete`, `profile:read`, `profile:update`, which
  `KeycloakRoleAdapter` rejects with 403 — and because create rolls the role
  back on failure, the whole save was lost. The catalog now carries the
  backend's `businessStaffAssignable` / `platformStaffAssignable` flags,
  generated from the enum, and the editor offers 38 of 42 business permissions.
- `permissions-server.ts` now reads exactly
  `resource_access["fluxipos-backend"].roles`, mirroring
  `SecurityConfig.jwtAuthenticationConverter`. It previously flattened every
  client, so Keycloak's `account` roles were treated as app permissions.
