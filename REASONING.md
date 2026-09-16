# Reasoning

## 1. Problem Understanding

The problem describes a common group contribution scenario where several people agree to contribute equally toward a shared expense, but in practice:

- Some participants pay their full share.
- Some participants pay only part of their share.
- Some participants may pay more than their share.
- Some participants do not pay anything.
- The organiser needs to know how much has been collected.
- The organiser needs to know how much each person still owes.
- At the end, the organiser needs a simple settlement plan showing who should pay whom.

The solution was therefore designed as a reusable group settlement manager rather than a one-time farewell-gift calculator.

The application can be used for farewell gifts, trips, dinners, events, shared purchases, and similar group expenses.

---

## 2. Product Approach

The application was structured around the main questions an organiser would ask:

1. What is the total budget?
2. How much should each participant contribute?
3. How much has each participant paid?
4. How much has been collected?
5. How much is still remaining?
6. Who still owes money?
7. Who has paid extra?
8. Who should pay whom to settle everything?

The main workflow is:

```text
Configure Pool
      ↓
Add Participants
      ↓
Calculate Equal Share
      ↓
Record Payments
      ↓
Calculate Balances
      ↓
Track Collection Progress
      ↓
Generate Settlements