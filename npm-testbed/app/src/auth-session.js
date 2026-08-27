// Demo auth surface. Path contains "auth" -> stamphog `auth` deny category.
// Present to prove Garnet's clean-dep bypass is SCOPED and cannot lift a
// non-dependency deny. Trivial, illustrative only.
export function sessionTtlMs() {
  return 15 * 60 * 1000;
}
