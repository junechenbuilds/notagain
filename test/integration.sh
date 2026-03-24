#!/bin/bash
# Integration tests for notagain API
# Requires: wrangler dev running on localhost:8787

set -euo pipefail

BASE="http://localhost:8787"
PASS=0
FAIL=0
SEED=50  # Seed count added to all responses

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

check() {
  local desc="$1"
  local expected="$2"
  local actual="$3"

  if echo "$actual" | grep -q "$expected"; then
    echo -e "  ${GREEN}✔${NC} $desc"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✘${NC} $desc"
    echo "    expected to contain: $expected"
    echo "    actual: $actual"
    FAIL=$((FAIL + 1))
  fi
}

check_not() {
  local desc="$1"
  local unexpected="$2"
  local actual="$3"

  if echo "$actual" | grep -q "$unexpected"; then
    echo -e "  ${RED}✘${NC} $desc"
    echo "    should NOT contain: $unexpected"
    echo "    actual: $actual"
    FAIL=$((FAIL + 1))
  else
    echo -e "  ${GREEN}✔${NC} $desc"
    PASS=$((PASS + 1))
  fi
}

check_status() {
  local desc="$1"
  local expected="$2"
  local actual="$3"

  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✔${NC} $desc (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✘${NC} $desc (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "═══════════════════════════════════════════"
echo " notagain API Integration Tests"
echo "═══════════════════════════════════════════"
echo ""

# ─── Test 1: GET /api/stats returns initial state ──────
echo "Test 1: Initial stats (with seed)"
STATS=$(curl -s "$BASE/api/stats")
check "returns globalCount with seed" "\"globalCount\":$SEED" "$STATS"
check "returns regionCounts" '"regionCounts"' "$STATS"
check "returns userRegion" '"userRegion"' "$STATS"

# ─── Test 2: POST /api/tap creates a session ──────────
echo ""
echo "Test 2: Create session (tap)"
TAP=$(curl -s -X POST "$BASE/api/tap")
SESSION_ID=$(echo "$TAP" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')
check "returns sessionId" '"sessionId"' "$TAP"
check "returns globalCount of seed+1" "\"globalCount\":$((SEED + 1))" "$TAP"
check "returns region" '"region"' "$TAP"
check "returns regionCounts" '"regionCounts"' "$TAP"

# ─── Test 3: Second tap blocked (active session) ─────
echo ""
echo "Test 3: Rate limit — block second tap"
TAP2_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tap")
check_status "second tap returns 429" "429" "$TAP2_STATUS"

TAP2_BODY=$(curl -s -X POST "$BASE/api/tap")
check "error says active session" '"You already have an active session"' "$TAP2_BODY"

# ─── Test 4: GET /api/stats shows updated count ──────
echo ""
echo "Test 4: Stats reflect active session"
STATS2=$(curl -s "$BASE/api/stats")
check "globalCount is seed+1" "\"globalCount\":$((SEED + 1))" "$STATS2"

# ─── Test 5: POST /api/end ends the session ──────────
echo ""
echo "Test 5: End session"
sleep 1  # Brief wait so duration > 0
END=$(curl -s -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}")
check "returns globalCount of seed" "\"globalCount\":$SEED" "$END"
check "returns duration" '"duration"' "$END"
check "returns regionCounts" '"regionCounts"' "$END"

# ─── Test 6: Double-end returns 404 ──────────────────
echo ""
echo "Test 6: Double-end blocked"
END2_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}")
check_status "double-end returns 404" "404" "$END2_STATUS"

# ─── Test 7: Can tap again after ending ──────────────
echo ""
echo "Test 7: Can tap again after ending"
TAP3=$(curl -s -X POST "$BASE/api/tap")
SESSION_ID2=$(echo "$TAP3" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')
check "new tap succeeds" '"sessionId"' "$TAP3"
check "globalCount is seed+1 again" "\"globalCount\":$((SEED + 1))" "$TAP3"

# Clean up — end the session
curl -s -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID2\"}" > /dev/null

# ─── Test 8: Validation errors ───────────────────────
echo ""
echo "Test 8: Validation errors"
BAD1_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d '{}')
check_status "missing sessionId returns 400" "400" "$BAD1_STATUS"

BAD2_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d 'not json')
check_status "invalid JSON returns 400" "400" "$BAD2_STATUS"

# ─── Test 9: UUID validation ────────────────────────
echo ""
echo "Test 9: UUID validation on /api/end"
BAD_UUID_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"not-a-uuid"}')
check_status "non-UUID sessionId returns 400" "400" "$BAD_UUID_STATUS"

BAD_EMPTY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":""}')
check_status "empty sessionId returns 400" "400" "$BAD_EMPTY_STATUS"

BAD_LONG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}')
check_status "very long sessionId returns 400" "400" "$BAD_LONG_STATUS"

BAD_NUM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":12345}')
check_status "numeric sessionId returns 400" "400" "$BAD_NUM_STATUS"

# ─── Test 10: Security headers ──────────────────────
echo ""
echo "Test 10: Security headers"
SEC_HEADERS=$(curl -s -I "$BASE/api/stats" 2>&1)
check "X-Frame-Options: DENY" "DENY" "$SEC_HEADERS"
check "X-Content-Type-Options: nosniff" "nosniff" "$SEC_HEADERS"
check "Referrer-Policy: no-referrer" "no-referrer" "$SEC_HEADERS"
check "Permissions-Policy present" "Permissions-Policy" "$SEC_HEADERS"
check "Content-Security-Policy present" "Content-Security-Policy" "$SEC_HEADERS"

# ─── Test 11: CORS ──────────────────────────────────
echo ""
echo "Test 11: CORS"
CORS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE/api/stats" \
  -H "Origin: http://localhost:3000")
check_status "OPTIONS returns 204" "204" "$CORS_STATUS"

CORS_HEADERS=$(curl -s -I -X OPTIONS "$BASE/api/stats" \
  -H "Origin: http://localhost:3000" 2>&1)
check "allows localhost origin" "localhost:3000" "$CORS_HEADERS"

# CORS rejection: evil origin should get the default allowed origin, not the evil one
EVIL_HEADERS=$(curl -s -I "$BASE/api/stats" \
  -H "Origin: https://evil.pages.dev" 2>&1)
check_not "rejects evil.pages.dev origin" "evil.pages.dev" "$EVIL_HEADERS"

# ─── Test 12: Session duration tracking ─────────────
echo ""
echo "Test 12: Session duration"
DUR_TAP=$(curl -s -X POST "$BASE/api/tap")
DUR_SID=$(echo "$DUR_TAP" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')
sleep 2
DUR_END=$(curl -s -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$DUR_SID\"}")
DUR_VAL=$(echo "$DUR_END" | sed -n 's/.*"duration":\([0-9]*\).*/\1/p')
if [ "$DUR_VAL" -ge 1 ] 2>/dev/null; then
  echo -e "  ${GREEN}✔${NC} duration >= 1 second (got ${DUR_VAL}s)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✘${NC} duration should be >= 1 (got ${DUR_VAL:-null})"
  FAIL=$((FAIL + 1))
fi

# ─── Test 13: 404 for unknown routes ────────────────
echo ""
echo "Test 13: Unknown routes"
UNK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/unknown")
check_status "unknown route returns 404" "404" "$UNK_STATUS"

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
