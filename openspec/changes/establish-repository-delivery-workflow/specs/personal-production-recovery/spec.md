# Personal Production Recovery Specification — Deferred

## Status

This capability is deferred to the future product roadmap. The PR3A shared production-operation lock and reset migration were withdrawn; no requirement in this file authorizes executable work in the current change. The already-integrated guarded local reset remains preserved at `HEAD`.

## Future Roadmap Capability

A future change may define safe, local, auditable production recovery, including guarded backup, isolated restore verification, and evidence. The following are six historical safety requirements for that future roadmap only; they are non-active and non-delivered in the current change. Before any implementation is approved, its design MUST address them:

1. A lock identity shared across separate checkouts that target the same Compose project.
2. Atomic interoperability between the legacy reset lock and any replacement lock namespace.
3. Source-drift detection before every destructive stage, including all live migration inputs.
4. Owner-identifiable, safe manual recovery for crash-orphaned locks.
5. Rollback compatibility so `HEAD` cannot ignore an active or orphaned replacement lock.
6. Failure handling that preserves the primary reset failure when lock release also fails.

The next separate activity is roadmap planning. No roadmap has been created or populated by this withdrawal.
