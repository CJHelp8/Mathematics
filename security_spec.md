# Security Specification — Axioma Math Platform

## 1. Data Invariants
1. **Strict Ownership**: A user can only read, create, and update their own `/users/{userId}` document and read/create their own `/users/{userId}/matches/{matchId}` documents. Cross-user reads, writes, and blanket collection listing are forbidden.
2. **Verified Identity**: All authenticated operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Immutable Match Ledger (Anti-Duplication)**: Match records in `/users/{userId}/matches/{matchId}` are append-only (`allow update: if false; allow delete: if false;`). Because `matchId` is unique per session, a match cannot be re-submitted to farm duplicate Elo or XP.
4. **Atomic Progression Sync**: Creating a match record requires an atomic update to the parent `/users/{userId}` document in the same batch/transaction (enforced via `getAfter`), and `elo` / `xp` / `level` / stats can only be modified during a match-record action or profile/settings action.
5. **Bounded Integrity**: `elo` is strictly `0..10000`, `xp >= 0`, `level >= 0`, string lengths are strictly bounded (`displayName` 2..40, `photoUrl` <= 120000), and all `createdAt` / `updatedAt` fields must equal `request.time`.

## 2. Dirty Dozen Attack Payloads (Must All Be Rejected)
1. **Cross-user read**: Authenticated user B tries `get(/users/userA)` -> `PERMISSION_DENIED`.
2. **Cross-user match injection**: User B tries `create(/users/userA/matches/m1)` -> `PERMISSION_DENIED`.
3. **Unverified email write**: User with `email_verified: false` tries `create(/users/userA)` -> `PERMISSION_DENIED`.
4. **Shadow field injection**: User A tries `update(/users/userA, { isAdmin: true, role: 'super' })` -> `PERMISSION_DENIED`.
5. **Elo overflow tampering**: User A tries `update(/users/userA, { elo: 99999 })` -> `PERMISSION_DENIED`.
6. **Negative XP/Level tampering**: User A tries `update(/users/userA, { xp: -100, level: -1 })` -> `PERMISSION_DENIED`.
7. **Timestamp spoofing**: User A tries `create(/users/userA/matches/m1, { createdAt: '2020-01-01' })` -> `PERMISSION_DENIED`.
8. **Duplicate/Mutated Match Replay**: User A tries `update(/users/userA/matches/m1, { xpEarned: 9999 })` -> `PERMISSION_DENIED`.
9. **Match Deletion**: User A tries `delete(/users/userA/matches/m1)` -> `PERMISSION_DENIED`.
10. **ID Poisoning**: User A tries `create(/users/userA/matches/bad$id..with.chars)` -> `PERMISSION_DENIED`.
11. **Denial of Wallet giant string**: User A tries `update(/users/userA, { displayName: '<1MB string>' })` -> `PERMISSION_DENIED`.
12. **Blanket list scraping**: User A tries `list(/users)` -> `PERMISSION_DENIED`.
