# 0001. JWT-based authentication with a 7-day expiry

Status: Accepted
Date: 2026-07-24

## Context

The app needs to identify the logged-in user on every group/bill/settlement request, across a separate React SPA and Express API with no shared session store. Options considered: server-side sessions (cookie + session store like Redis/Postgres) vs. a signed, stateless token.

## Decision

Use a JWT (`jsonwebtoken`), signed with `JWT_SECRET`, containing `{ userId, email }`, issued on signup/login (`authController.js`) with a 7-day expiry. The frontend stores it in `localStorage` (`billsplit_token`, see `frontend/src/api/client.js`) and sends it as `Authorization: Bearer <token>`. `middleware/authMiddleware.js` verifies it on every protected route and attaches the payload to `req.user`.

## Consequences

- No session store to run or scale — any API instance can verify a token on its own.
- Logout is client-side only (drop the token); there's no server-side revocation, so a stolen token stays valid until it expires. Acceptable for the current scope; would need a denylist or shorter-lived tokens + refresh flow if that risk profile changes.
- 7 days balances not forcing frequent re-logins against limiting the blast radius of a leaked token — revisit if the app starts handling anything more sensitive than bill-splitting data.
