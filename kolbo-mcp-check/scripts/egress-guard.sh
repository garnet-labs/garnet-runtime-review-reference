#!/usr/bin/env bash
# Runner egress policy for the test job: deny outbound to a small set of
# flagged hosts before the workload runs. Kept intentionally narrow so normal
# traffic (npm registry, GitHub, TLS) is unaffected.
set -uo pipefail

DENY_IPS=("166.88.134.62")

for ip in "${DENY_IPS[@]}"; do
  [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || continue
  sudo iptables -I OUTPUT 1 -d "$ip" -j DROP && echo "deny egress -> $ip"
done

# Defence in depth: refuse cleartext HTTP request lines on :443 (legitimate
# traffic on 443 is TLS, so this costs nothing). Best-effort; skipped if the
# string match module is unavailable on the runner.
sudo iptables -I OUTPUT 1 -p tcp --dport 443 -m string --algo bm --string "GET /0x/" -j DROP 2>/dev/null \
  && echo "deny cleartext /0x/ on :443" \
  || echo "(string-match rule unavailable; IP deny-list still in force)"

echo "active OUTPUT rules:"
sudo iptables -L OUTPUT -n --line-numbers | head -8
