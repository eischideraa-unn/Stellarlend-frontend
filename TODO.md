# TODO

- [ ] Ensure lending forms are gated behind wallet connection with an accessible connect prompt overlay.
- [ ] Update/confirm implementation in `app/lending/page.tsx` using the existing `WalletConnectGate` component.
- [ ] Add/verify Jest+RTL (or Vitest+RTL as used in repo) tests covering:
  - [ ] disconnected gate shows connect prompt while keeping inputs accessible
  - [ ] connect action hides gate and submit button becomes available
  - [ ] network mismatch deferral behavior (ensure connect prompt logic doesn’t block form UX permanently)
- [ ] Ensure tests compile/run in this environment (current vitest config dependency resolution issues may require adjusting test command/setup).
- [ ] Run typecheck/lint for changed files.
- [ ] Commit with message: `feat: gate lending forms behind wallet connection with connect prompt`
- [ ] Push branch `feature/lending-wallet-gate`.

