#!/bin/bash
# Multi-user concurrency tests for notagain API
# Simulates multiple users by setting CF-Connecting-IP header
# Requires: wrangler dev running on localhost:8787

set -euo pipefail

BASE="http://localhost:8787"
PASS=0
FAIL=0
SEED=50
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

check_count() {
  local desc="$1"
  local expected="$2"
  local stats
  stats=$(curl -s "$BASE/api/stats")
  local actual
  actual=$(echo "$stats" | sed -n 's/.*"globalCount":\([0-9]*\).*/\1/p')

  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✔${NC} $desc (globalCount=$actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✘${NC} $desc (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

tap_as() {
  local ip="$1"
  local outfile="$2"
  curl -s -X POST "$BASE/api/tap" \
    -H "CF-Connecting-IP: $ip" > "$outfile"
}

end_session() {
  local sid="$1"
  local ip="$2"
  curl -s -X POST "$BASE/api/end" \
    -H "Content-Type: application/json" \
    -H "CF-Connecting-IP: $ip" \
    -d "{\"sessionId\":\"$sid\"}"
}

get_sid() {
  sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p' "$1"
}

get_status() {
  sed -n 's/.*"error":"\([^"]*\)".*/\1/p' "$1"
}

echo ""
echo "═══════════════════════════════════════════"
echo " notagain Multi-User Concurrency Tests"
echo "═══════════════════════════════════════════"
echo ""

NUM_USERS=5

# ─── Scenario 1: N users tap simultaneously ─────────
echo "Scenario 1: $NUM_USERS users tap simultaneously"

# Fire all taps in parallel
for i in $(seq 1 $NUM_USERS); do
  tap_as "10.0.0.$i" "$TMPDIR/tap_$i.json" &
done
wait

# Verify all got sessionIds
ALL_OK=true
for i in $(seq 1 $NUM_USERS); do
  SID=$(get_sid "$TMPDIR/tap_$i.json")
  if [ -z "$SID" ]; then
    echo -e "  ${RED}✘${NC} User $i did not get a sessionId"
    ERR=$(get_status "$TMPDIR/tap_$i.json")
    echo "    error: $ERR"
    FAIL=$((FAIL + 1))
    ALL_OK=false
  fi
done

if $ALL_OK; then
  echo -e "  ${GREEN}✔${NC} All $NUM_USERS users got sessionIds"
  PASS=$((PASS + 1))
fi

# Verify global count = N + seed
check_count "globalCount = $NUM_USERS + seed" "$((NUM_USERS + SEED))"

# ─── Scenario 2: Same IP blocked while active ───────
echo ""
echo "Scenario 2: IP isolation — same IP blocked, different IP allowed"

# User 1 already has an active session from scenario 1
DUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tap" \
  -H "CF-Connecting-IP: 10.0.0.1")

if [ "$DUP_STATUS" = "429" ]; then
  echo -e "  ${GREEN}✔${NC} Same IP (10.0.0.1) blocked with 429"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✘${NC} Same IP should return 429, got $DUP_STATUS"
  FAIL=$((FAIL + 1))
fi

# New IP should work
NEW_TAP=$(curl -s -X POST "$BASE/api/tap" -H "CF-Connecting-IP: 10.0.0.99")
NEW_SID=$(echo "$NEW_TAP" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')
if [ -n "$NEW_SID" ]; then
  echo -e "  ${GREEN}✔${NC} Different IP (10.0.0.99) allowed"
  PASS=$((PASS + 1))
  # Clean up
  end_session "$NEW_SID" "10.0.0.99" > /dev/null
else
  echo -e "  ${RED}✘${NC} Different IP should be allowed"
  FAIL=$((FAIL + 1))
fi

# ─── Scenario 3: All users end simultaneously ───────
echo ""
echo "Scenario 3: $NUM_USERS users end simultaneously"

for i in $(seq 1 $NUM_USERS); do
  SID=$(get_sid "$TMPDIR/tap_$i.json")
  if [ -n "$SID" ]; then
    end_session "$SID" "10.0.0.$i" > "$TMPDIR/end_$i.json" &
  fi
done
wait

# Give cache a moment to invalidate
sleep 1

check_count "globalCount back to seed after all end" "$SEED"

# ─── Scenario 4: Rapid tap-end cycling (1 user) ─────
echo ""
CYCLES=10
echo "Scenario 4: Rapid tap-end cycling ($CYCLES cycles, 1 user)"

CYCLE_OK=true
for i in $(seq 1 $CYCLES); do
  # Tap
  CTAP=$(curl -s -X POST "$BASE/api/tap" -H "CF-Connecting-IP: 10.0.1.1")
  CSID=$(echo "$CTAP" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')

  if [ -z "$CSID" ]; then
    echo -e "  ${RED}✘${NC} Cycle $i: tap failed"
    ERR=$(echo "$CTAP" | sed -n 's/.*"error":"\([^"]*\)".*/\1/p')
    echo "    error: $ERR"
    FAIL=$((FAIL + 1))
    CYCLE_OK=false
    break
  fi

  # End
  CEND=$(curl -s -X POST "$BASE/api/end" \
    -H "Content-Type: application/json" \
    -H "CF-Connecting-IP: 10.0.1.1" \
    -d "{\"sessionId\":\"$CSID\"}")
done

if $CYCLE_OK; then
  echo -e "  ${GREEN}✔${NC} Completed $CYCLES tap-end cycles without error"
  PASS=$((PASS + 1))
fi

check_count "globalCount = seed after cycling" "$SEED"

# ─── Scenario 5: Mixed operations ───────────────────
echo ""
echo "Scenario 5: Mixed operations (tap + poll + end concurrently)"

# 3 users tap
for i in $(seq 1 3); do
  tap_as "10.0.2.$i" "$TMPDIR/mix_tap_$i.json" &
done
# 2 stats polls
curl -s "$BASE/api/stats" > /dev/null &
curl -s "$BASE/api/stats" > /dev/null &
wait

# Verify 3 active sessions
check_count "3 active after mixed tap+poll" "$((3 + SEED))"

# Now end all 3 while polling
for i in $(seq 1 3); do
  SID=$(get_sid "$TMPDIR/mix_tap_$i.json")
  if [ -n "$SID" ]; then
    end_session "$SID" "10.0.2.$i" > /dev/null &
  fi
done
curl -s "$BASE/api/stats" > /dev/null &
curl -s "$BASE/api/stats" > /dev/null &
wait

sleep 1
check_count "back to seed after mixed end+poll" "$SEED"

# ─── Scenario 6: Count never negative ───────────────
echo ""
echo "Scenario 6: Count never goes negative"

# Try to end a fake session (should 400 since not valid UUID)
FAKE_END_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"00000000-0000-4000-8000-000000000000"}')

STATS_AFTER=$(curl -s "$BASE/api/stats")
COUNT_AFTER=$(echo "$STATS_AFTER" | sed -n 's/.*"globalCount":\([0-9]*\).*/\1/p')

if [ "$COUNT_AFTER" -ge "$SEED" ] 2>/dev/null; then
  echo -e "  ${GREEN}✔${NC} globalCount ($COUNT_AFTER) never went below seed ($SEED)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✘${NC} globalCount ($COUNT_AFTER) went below seed ($SEED)"
  FAIL=$((FAIL + 1))
fi

# ─── Summary ────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo -e " ${GREEN}All $TOTAL tests passed!${NC}"
else
  echo -e " ${RED}$FAIL/$TOTAL tests failed${NC}"
fi
echo "═══════════════════════════════════════════"
echo ""

exit $FAIL
