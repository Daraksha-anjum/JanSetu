# JanSetu Security Architecture & Test Specification

This document details the high-security zero-trust Firestore access control policies and payload-first Test-Driven Development (TDD) blueprint for the JanSetu hyperlocal platform.

---

## 1. Core Data Invariants & Access Control Matrices

| Collection Path | Role: Citizen (Authenticated) | Role: Coordinator | Role: Municipal Authority | Role: Owner/Reporter |
| :--- | :--- | :--- | :--- | :--- |
| `/users/{userId}` | Read (Public profile list & get) | Read, write stats/reputation | Read | Read & Write Profile metadata (No self-assigning `isCoordinator`) |
| `/users/{userId}/private/info` | Read Denied | Read Denied | Read Denied | Read & Write (Strictly isolated PII) |
| `/reports/{reportId}` | Read, Create, Update (Vote/Verify only) | Read, Write (Highlight, Escalate) | Read, Write (Set resolving) | Read, Update (Non-immutable fields, No self-verification) |
| `/reports/{reportId}/comments/{commentId}`| Read, Create | Read, Create, Delete | Read, Create | Read, Create, Delete (Own comment) |
| `/reports/{reportId}/updates/{updateId}` | Read | Read, Create (Log actions) | Read, Create (Official logs) | Read |
| `/communities/{communityId}` | Read | Read, Update (Coordinator stats) | Read | Read |
| `/communities/{communityId}/announcements/*`| Read | Read, Write (Announcements) | Read | Read |
| `/communities/{communityId}/insights/latest`| Read | Read | Read | Read |

---

## 2. The "Dirty Dozen" Exploit Payloads

These 12 malicious payloads are designed to challenge our system's identity, integrity, and state transition laws. Every one of these payloads **MUST** be blocked with a `PERMISSION_DENIED` outcome by the Firestore rules.

### Exploit 1: User Self-Elevation of coordinator status
* **Target Path:** `/users/malicious_user`
* **Action:** `create` or `update`
* **Vulnerability Attempted:** Privilege Escalation (Self-assigning coordinator capabilities).
* **Payload:**
```json
{
  "id": "malicious_user",
  "name": "Attacker",
  "reputationPoints": 0,
  "badge": "Civic Reporter",
  "reportsSubmittedCount": 0,
  "verificationsCount": 0,
  "communityContributionsCount": 0,
  "isCoordinator": true
}
```
* **Security Guard:** Rules must forbid `incoming().isCoordinator == true` unless verified against an admin group or if `isCoordinator` remains unmodified.

### Exploit 2: Accessing Another Citizen's Private PII
* **Target Path:** `/users/victim_user/private/info`
* **Action:** `get` / `read` by `attacker_user`
* **Vulnerability Attempted:** PII Leak / Direct Object Reference breach.
* **Payload:** Requesting read operations on `/users/victim_user/private/info` while authenticated as `attacker_user`.
* **Security Guard:** `allow read: if request.auth.uid == userId;`

### Exploit 3: Identity Spoofing during Issue Creation
* **Target Path:** `/reports/report_99`
* **Action:** `create` by `attacker_user`
* **Vulnerability Attempted:** Impersonating another prominent community user.
* **Payload:**
```json
{
  "id": "report_99",
  "reporterId": "victim_community_leader_uid",
  "reporterName": "Community Leader",
  "title": "Severe Pothole",
  "description": "Critical road defect on sector 4.",
  "image": "data:image/jpeg;base64,...",
  "locationName": "Sector 4 Main St",
  "community": "Old Bowenpally",
  "category": "Road Damage",
  "severity": "High",
  "status": "Reported",
  "verificationCount": 0,
  "confirmedBy": [],
  "resolvedBy": [],
  "createdAt": "2026-06-25T12:00:00Z",
  "updatedAt": "2026-06-25T12:00:00Z"
}
```
* **Security Guard:** `incoming().reporterId == request.auth.uid`

### Exploit 4: Denial-of-Wallet String Poisoning Attack
* **Target Path:** `/reports/report_100`
* **Action:** `create` or `update`
* **Vulnerability Attempted:** Financial drain via index inflation (1MB string payload in title).
* **Payload:**
```json
{
  "title": "[1 Million Character String]",
  "category": "Drainage Issue"
}
```
* **Security Guard:** `incoming().title.size() <= 150` and `incoming().description.size() <= 3000`

### Exploit 5: Self-Verification / Upvote Stuffing
* **Target Path:** `/reports/report_abc`
* **Action:** `update` by `reporter_uid` (who is the original reporter of `report_abc`)
* **Vulnerability Attempted:** Upvoting one's own report to artificially boost reputation.
* **Payload:** Modifying `confirmedBy` to include their own UID.
* **Security Guard:** `!(request.auth.uid in incoming().confirmedBy) || (existing().reporterId != request.auth.uid)`

### Exploit 6: State Shortcutting (Directly Completing Report)
* **Target Path:** `/reports/report_abc`
* **Action:** `update` by standard citizen `citizen_uid`
* **Vulnerability Attempted:** Artificially marking an active issue as "Resolved" without a community/coordinator audit.
* **Payload:**
```json
{
  "status": "Resolved",
  "resolvedBy": ["citizen_uid"]
}
```
* **Security Guard:** Transition to `Resolved` must require coordinator privileges or strict threshold rules (at least 3 unique citizen confirmations).

### Exploit 7: System-Generated Metadata Forgery
* **Target Path:** `/reports/report_abc`
* **Action:** `update` by `citizen_uid`
* **Vulnerability Attempted:** Overwriting Gemini-generated diagnostic fields.
* **Payload:**
```json
{
  "verificationConfidence": 100,
  "evidenceStrength": "Strong",
  "verificationReliability": "High",
  "riskLevel": "Low",
  "justification": "Exploit: AI-verified manually by client"
}
```
* **Security Guard:** Prevent modification of AI diagnostic fields on standard updates: `!incoming().diff(existing()).affectedKeys().hasAny(['verificationConfidence', 'evidenceStrength', 'verificationReliability', 'justification'])`.

### Exploit 8: Timeline Actor Impersonation
* **Target Path:** `/reports/report_abc/updates/update_123`
* **Action:** `create` by standard `citizen_uid`
* **Vulnerability Attempted:** Faking official Municipal Authority resolution updates.
* **Payload:**
```json
{
  "id": "update_123",
  "status": "In Progress",
  "message": "Public works department has dispatched repairs.",
  "actorName": "Commissioner of Municipal Corp",
  "actorRole": "Authority"
}
```
* **Security Guard:** `incoming().actorRole == 'Authority'` requires looking up the user profile to confirm permissions, or validation of authentic user claims.

### Exploit 9: Orphaned Comment Injection (Dangling Document)
* **Target Path:** `/reports/NON_EXISTENT_REPORT/comments/comment_1`
* **Action:** `create` by `citizen_uid`
* **Vulnerability Attempted:** Injecting orphaned comments to bloat database costs.
* **Payload:** Creating a sub-collection item under a document ID that does not exist in the parent collection.
* **Security Guard:** `exists(/databases/$(database)/documents/reports/$(reportId))` on subcollection creations.

### Exploit 10: Client-Side Query Scraper
* **Target Path:** `/reports`
* **Action:** `list` by `citizen_uid` without filters
* **Vulnerability Attempted:** Unfiltered full-database index extraction.
* **Payload:** Performing a get request on `/reports` without community or status filters.
* **Security Guard:** `allow list: if resource.data.community == request.auth.token.selectedCommunity;` (Forces client to pass correct securely formulated filtering query).

### Exploit 11: Immutable Field Manipulation
* **Target Path:** `/reports/report_abc`
* **Action:** `update` by `reporter_uid`
* **Vulnerability Attempted:** Shifting the report to another community after generation to manipulate analytics.
* **Payload:**
```json
{
  "community": "New Bowenpally",
  "reporterId": "hijacked_id",
  "createdAt": "2020-01-01T00:00:00Z"
}
```
* **Security Guard:** `incoming().community == existing().community && incoming().reporterId == existing().reporterId && incoming().createdAt == existing().createdAt`

### Exploit 12: Client Timestamp Forgery
* **Target Path:** `/reports/report_abc`
* **Action:** `create` by `citizen_uid`
* **Vulnerability Attempted:** Pre-dating creation reports to falsify municipal resolution performance metrics.
* **Payload:**
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
* **Security Guard:** `incoming().createdAt == request.time`

---

## 3. The Security Test Runner Specification (`firestore.rules.test.ts`)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

describe("JanSetu Fortress Rules Test Suite", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "jansetu-civic-app",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
        host: "localhost",
        port: 8080
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // TDD 1: Block privilege escalation
  it("Exploit 1: Deny setting isCoordinator to true", async () => {
    const maliciousAuth = testEnv.authenticatedContext("attacker_user");
    await assertFails(
      maliciousAuth.firestore().collection("users").doc("attacker_user").set({
        id: "attacker_user",
        name: "Attacker",
        reputationPoints: 0,
        badge: "Civic Reporter",
        reportsSubmittedCount: 0,
        verificationsCount: 0,
        communityContributionsCount: 0,
        isCoordinator: true
      })
    );
  });

  // TDD 2: Protect private PII
  it("Exploit 2: Forbid reading other citizen's PII", async () => {
    const maliciousAuth = testEnv.authenticatedContext("attacker_user");
    await assertFails(
      maliciousAuth.firestore().collection("users").doc("victim_user").collection("private").doc("info").get()
    );
  });

  // TDD 3: Impersonation Safeguard
  it("Exploit 3: Enforce reporterId matches authenticated UID", async () => {
    const maliciousAuth = testEnv.authenticatedContext("attacker_user");
    await assertFails(
      maliciousAuth.firestore().collection("reports").doc("report_99").set({
        id: "report_99",
        reporterId: "victim_user",
        title: "Dangerous Sinkhole",
        description: "Large sinkhole opening up next to central square.",
        image: "data:image/jpeg;base64,...",
        locationName: "Central Square",
        community: "Old Bowenpally",
        category: "Road Damage",
        severity: "High",
        status: "Reported",
        verificationCount: 0,
        confirmedBy: [],
        resolvedBy: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );
  });

  // TDD 4: Denial-of-Wallet mitigation
  it("Exploit 4: Fail writes exceeding safe field sizes", async () => {
    const maliciousAuth = testEnv.authenticatedContext("attacker_user");
    const massiveTitle = "X".repeat(500); // Exceeds 150 Limit
    await assertFails(
      maliciousAuth.firestore().collection("reports").doc("report_100").set({
        id: "report_100",
        reporterId: "attacker_user",
        title: massiveTitle,
        description: "Small leakage",
        image: "data:image/jpeg;base64,...",
        locationName: "Main gate",
        community: "Old Bowenpally",
        category: "Water Leakage",
        severity: "Low",
        status: "Reported",
        verificationCount: 0,
        confirmedBy: [],
        resolvedBy: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );
  });
});
```
