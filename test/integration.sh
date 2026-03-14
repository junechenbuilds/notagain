#!/bin/bash
# Integration tests for notagain API
# Requires: wrangler dev running on localhost:8787

set -euo pipefail

BASE="http://localhost:8787"
PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
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
echo "Test 1: Initial stats"
STATS=$(curl -s "$BASE/api/stats")
check "returns globalCount" '"globalCount":0' "$STATS"
check "returns regionCounts" '"regionCounts"' "$STATS"
check "returns userRegion" '"userRegion"' "$STATS"

# ─── Test 2: POST /api/tap creates a session ──────────
echo ""
echo "Test 2: Create session (tap)"
TAP=$(curl -s -X POST "$BASE/api/tap")
TAP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tap")
# First tap might succeed or fail (rate limit from test 2)
# Use the first tap result
SESSION_ID=$(echo "$TAP" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')
check "returns sessionId" '"sessionId"' "$TAP"
check "returns globalCount of 1" '"globalCount":1' "$TAP"
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
check "globalCount is 1" '"globalCount":1' "$STATS2"

# ─── Test 5: POST /api/end ends the session ──────────
echo ""
echo "Test 5: End session"
END=$(curl -s -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}")
check "returns globalCount of 0" '"globalCount":0' "$END"
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
TAP3_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tap")
SESSION_ID2=$(echo "$TAP3" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')
check "new tap succeeds" '"sessionId"' "$TAP3"
check "globalCount is 1 again" '"globalCount":1' "$TAP3"

# Clean up — end the session
curl -s -X POST "$BASE/api/end" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID2\"}" > /dev/null

# ─── Test 8: End with missing sessionId ──────────────
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

# ─── Test 9: CORS preflight ─────────────────────────
echo ""
echo "Test 9: CORS"
CORS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE/api/stats" \
  -H "Origin: http://localhost:3000")
check_status "OPTIONS returns 204" "204" "$CORS_STATUS"

CORS_HEADERS=$(curl -s -I -X OPTIONS "$BASE/api/stats" \
  -H "Origin: http://localhost:3000" 2>&1)
check "allows localhost origin" "localhost:3000" "$CORS_HEADERS"

# ─── Test 10: 404 for unknown routes ────────────────
echo ""
echo "Test 10: Unknown routes"
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
