#!/usr/bin/env bash
# =============================================================================
# API Test Script — Full CRUD coverage for all routes
# Usage: ./test-api.sh [BASE_URL]
# Example: ./test-api.sh http://localhost:3000
# =============================================================================

BASE_URL="${1:-http://localhost:3000}"
API="$BASE_URL/api"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Counters ─────────────────────────────────────────────────────────────────
PASS=0
FAIL=0
SKIP=0

# ── IDs collected during the run (populated dynamically) ─────────────────────
VENDOR_ID=""
VENDOR_ID_2=""
CATEGORY_ID=""
CATEGORY_ID_CHILD=""
PRODUCT_ID=""
PRODUCT_ID_2=""
ORDER_ID=""
ORDER_ITEM_ID=""

# =============================================================================
# Helpers
# =============================================================================

print_header() {
  echo ""
  echo -e "${BOLD}${BLUE}════════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}${BLUE}  $1${RESET}"
  echo -e "${BOLD}${BLUE}════════════════════════════════════════════════════════${RESET}"
}

print_test() {
  echo ""
  echo -e "${CYAN}▶ TEST: $1${RESET}"
}

pass() {
  echo -e "  ${GREEN}✔ PASS${RESET} — $1"
  ((PASS++))
}

fail() {
  echo -e "  ${RED}✘ FAIL${RESET} — $1"
  ((FAIL++))
}

skip() {
  echo -e "  ${YELLOW}⊘ SKIP${RESET} — $1"
  ((SKIP++))
}

info() {
  echo -e "  ${YELLOW}ℹ${RESET}  $1"
}

# Execute a curl request and return body + http code
# Usage: call METHOD URL [body_json]
call() {
  local method="$1"
  local url="$2"
  local body="$3"

  if [[ -n "$body" ]]; then
    curl -s -w "\n%{http_code}" \
      -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -s -w "\n%{http_code}" \
      -X "$method" "$url" \
      -H "Content-Type: application/json"
  fi
}

# Parse the last line as HTTP status, rest as body
parse_response() {
  local raw="$1"
  HTTP_CODE=$(echo "$raw" | tail -n1)
  BODY=$(echo "$raw" | sed '$d')
}

# Assert the HTTP code matches expected
assert_status() {
  local expected="$1"
  local label="$2"
  if [[ "$HTTP_CODE" == "$expected" ]]; then
    pass "$label (HTTP $HTTP_CODE)"
    return 0
  else
    fail "$label — expected HTTP $expected, got HTTP $HTTP_CODE"
    info "Response body: $BODY"
    return 1
  fi
}

# Extract a JSON field value (naive but dependency-free)
json_get() {
  local json="$1"
  local key="$2"
  echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | head -1 | sed "s/\"$key\":\"//;s/\"//"
}

# =============================================================================
# Pre-flight check
# =============================================================================

print_header "Pre-flight: checking server at $BASE_URL"
RAW=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [[ "$RAW" == "000" ]]; then
  echo -e "${RED}ERROR: Server is not reachable at $BASE_URL${RESET}"
  echo "Start your Next.js app first:  npm run dev"
  exit 1
else
  echo -e "${GREEN}Server reachable (HTTP $RAW)${RESET}"
fi

# =============================================================================
# VENDORS
# =============================================================================

print_header "VENDORS"

# ── POST /api/vendors ─────────────────────────────────────────────────────────
print_test "POST /api/vendors — create vendor 1 (valid)"
RAW=$(call POST "$API/vendors" '{
  "name": "Sunrise Biscuits Co.",
  "description": "Artisan biscuit makers since 1987",
  "logoUrl": "https://example.com/logos/sunrise.png",
  "pubkey": "0xABC123DEF456ABC123DEF456ABC123DEF456ABC1"
}')
parse_response "$RAW"
if assert_status 201 "Create vendor 1"; then
  VENDOR_ID=$(json_get "$BODY" "id")
  info "Vendor 1 ID: $VENDOR_ID"
fi

print_test "POST /api/vendors — create vendor 2 (for product variety)"
RAW=$(call POST "$API/vendors" '{
  "name": "Golden Grains Ltd.",
  "description": "Premium grain products",
  "pubkey": "0xDEF456ABC123DEF456ABC123DEF456ABC123DEF4"
}')
parse_response "$RAW"
if assert_status 201 "Create vendor 2"; then
  VENDOR_ID_2=$(json_get "$BODY" "id")
  info "Vendor 2 ID: $VENDOR_ID_2"
fi

print_test "POST /api/vendors — duplicate pubkey (should fail 409)"
RAW=$(call POST "$API/vendors" '{
  "name": "Duplicate Vendor",
  "pubkey": "0xABC123DEF456ABC123DEF456ABC123DEF456ABC1"
}')
parse_response "$RAW"
assert_status 409 "Duplicate pubkey rejected"

print_test "POST /api/vendors — missing required fields (should fail 400)"
RAW=$(call POST "$API/vendors" '{"description": "No name or pubkey"}')
parse_response "$RAW"
assert_status 400 "Missing fields rejected"

# ── GET /api/vendors ──────────────────────────────────────────────────────────
print_test "GET /api/vendors — list all vendors"
RAW=$(call GET "$API/vendors")
parse_response "$RAW"
assert_status 200 "List vendors"

print_test "GET /api/vendors?page=1&limit=1 — pagination"
RAW=$(call GET "$API/vendors?page=1&limit=1")
parse_response "$RAW"
assert_status 200 "Pagination works"

# ── GET /api/vendors/:id ──────────────────────────────────────────────────────
print_test "GET /api/vendors/:id — fetch vendor 1"
if [[ -z "$VENDOR_ID" ]]; then skip "No vendor ID"; else
  RAW=$(call GET "$API/vendors/$VENDOR_ID")
  parse_response "$RAW"
  assert_status 200 "Fetch vendor by ID"
fi

print_test "GET /api/vendors/:id — non-existent ID (should fail 404)"
RAW=$(call GET "$API/vendors/nonexistent_id_xyz")
parse_response "$RAW"
assert_status 404 "Non-existent vendor 404"

# ── PUT /api/vendors/:id ──────────────────────────────────────────────────────
print_test "PUT /api/vendors/:id — update vendor name and description"
if [[ -z "$VENDOR_ID" ]]; then skip "No vendor ID"; else
  RAW=$(call PUT "$API/vendors/$VENDOR_ID" '{
    "name": "Sunrise Biscuits Co. (Updated)",
    "description": "Artisan biscuit makers since 1987 — now with new flavours!"
  }')
  parse_response "$RAW"
  assert_status 200 "Update vendor"
fi

print_test "PUT /api/vendors/:id — steal another vendor pubkey (should fail 409)"
if [[ -z "$VENDOR_ID" || -z "$VENDOR_ID_2" ]]; then skip "Missing IDs"; else
  RAW=$(call PUT "$API/vendors/$VENDOR_ID" '{
    "pubkey": "0xDEF456ABC123DEF456ABC123DEF456ABC123DEF4"
  }')
  parse_response "$RAW"
  assert_status 409 "Pubkey conflict rejected"
fi

# =============================================================================
# CATEGORIES
# =============================================================================

print_header "CATEGORIES"

# ── POST /api/categories ──────────────────────────────────────────────────────
print_test "POST /api/categories — create root category"
RAW=$(call POST "$API/categories" '{
  "name": "Groceries",
  "slug": "groceries"
}')
parse_response "$RAW"
if assert_status 201 "Create root category"; then
  CATEGORY_ID=$(json_get "$BODY" "id")
  info "Category ID: $CATEGORY_ID"
fi

print_test "POST /api/categories — create child category"
if [[ -z "$CATEGORY_ID" ]]; then skip "No parent category ID"; else
  RAW=$(call POST "$API/categories" "{
    \"name\": \"Snacks\",
    \"slug\": \"snacks\",
    \"parentId\": \"$CATEGORY_ID\"
  }")
  parse_response "$RAW"
  if assert_status 201 "Create child category"; then
    CATEGORY_ID_CHILD=$(json_get "$BODY" "id")
    info "Child Category ID: $CATEGORY_ID_CHILD"
  fi
fi

print_test "POST /api/categories — duplicate slug (should fail 409)"
RAW=$(call POST "$API/categories" '{"name": "Different Name", "slug": "groceries"}')
parse_response "$RAW"
assert_status 409 "Duplicate slug rejected"

print_test "POST /api/categories — missing fields (should fail 400)"
RAW=$(call POST "$API/categories" '{"name": "No Slug"}')
parse_response "$RAW"
assert_status 400 "Missing slug rejected"

print_test "POST /api/categories — invalid parentId (should fail 404)"
RAW=$(call POST "$API/categories" '{"name": "Orphan", "slug": "orphan-cat", "parentId": "fake_parent_id"}')
parse_response "$RAW"
assert_status 404 "Invalid parent rejected"

# ── GET /api/categories ───────────────────────────────────────────────────────
print_test "GET /api/categories — tree view (default)"
RAW=$(call GET "$API/categories")
parse_response "$RAW"
assert_status 200 "List categories (tree)"

print_test "GET /api/categories?flat=true — flat list"
RAW=$(call GET "$API/categories?flat=true")
parse_response "$RAW"
assert_status 200 "List categories (flat)"

# ── GET /api/categories/:id ───────────────────────────────────────────────────
print_test "GET /api/categories/:id — fetch root category"
if [[ -z "$CATEGORY_ID" ]]; then skip "No category ID"; else
  RAW=$(call GET "$API/categories/$CATEGORY_ID")
  parse_response "$RAW"
  assert_status 200 "Fetch category by ID"
fi

# ── PUT /api/categories/:id ───────────────────────────────────────────────────
print_test "PUT /api/categories/:id — rename category"
if [[ -z "$CATEGORY_ID" ]]; then skip "No category ID"; else
  RAW=$(call PUT "$API/categories/$CATEGORY_ID" '{"name": "Groceries & Food"}')
  parse_response "$RAW"
  assert_status 200 "Update category name"
fi

print_test "PUT /api/categories/:id — self-parent (should fail 400)"
if [[ -z "$CATEGORY_ID" ]]; then skip "No category ID"; else
  RAW=$(call PUT "$API/categories/$CATEGORY_ID" "{\"parentId\": \"$CATEGORY_ID\"}")
  parse_response "$RAW"
  assert_status 400 "Self-parent rejected"
fi

# =============================================================================
# PRODUCTS
# =============================================================================

print_header "PRODUCTS"

# ── POST /api/products ────────────────────────────────────────────────────────
print_test "POST /api/products — create product 1"
if [[ -z "$VENDOR_ID" || -z "$CATEGORY_ID_CHILD" ]]; then skip "Missing vendor/category IDs"; else
  RAW=$(call POST "$API/products" "{
    \"productID\": \"BISC-001\",
    \"sku\": \"SUN-BISC-ORIG-200G\",
    \"gtin\": \"01234567890123\",
    \"mpn\": \"SB-ORIG-200\",
    \"name\": \"Original Butter Biscuits\",
    \"description\": \"Classic butter biscuits made with real cream. 200g pack.\",
    \"images\": [
      \"https://example.com/images/bisc-001-front.jpg\",
      \"https://example.com/images/bisc-001-back.jpg\"
    ],
    \"price\": 4.99,
    \"currency\": \"USD\",
    \"stockQuantity\": 150,
    \"vendorId\": \"$VENDOR_ID\",
    \"categoryId\": \"$CATEGORY_ID_CHILD\"
  }")
  parse_response "$RAW"
  if assert_status 201 "Create product 1"; then
    PRODUCT_ID=$(json_get "$BODY" "id")
    info "Product 1 ID: $PRODUCT_ID"
  fi
fi

print_test "POST /api/products — create product 2 (different vendor)"
if [[ -z "$VENDOR_ID_2" || -z "$CATEGORY_ID_CHILD" ]]; then skip "Missing vendor/category IDs"; else
  RAW=$(call POST "$API/products" "{
    \"productID\": \"CRAK-001\",
    \"sku\": \"GG-CRAK-SEA-100G\",
    \"name\": \"Sea Salt Crackers\",
    \"description\": \"Light and crispy sea salt crackers. 100g pack.\",
    \"images\": [\"https://example.com/images/crak-001.jpg\"],
    \"price\": 2.49,
    \"currency\": \"USD\",
    \"stockQuantity\": 80,
    \"vendorId\": \"$VENDOR_ID_2\",
    \"categoryId\": \"$CATEGORY_ID_CHILD\"
  }")
  parse_response "$RAW"
  if assert_status 201 "Create product 2"; then
    PRODUCT_ID_2=$(json_get "$BODY" "id")
    info "Product 2 ID: $PRODUCT_ID_2"
  fi
fi

print_test "POST /api/products — duplicate SKU (should fail 409)"
if [[ -z "$VENDOR_ID" || -z "$CATEGORY_ID_CHILD" ]]; then skip "Missing IDs"; else
  RAW=$(call POST "$API/products" "{
    \"productID\": \"BISC-999\",
    \"sku\": \"SUN-BISC-ORIG-200G\",
    \"name\": \"Duplicate SKU Product\",
    \"description\": \"This should fail.\",
    \"price\": 1.00,
    \"vendorId\": \"$VENDOR_ID\",
    \"categoryId\": \"$CATEGORY_ID_CHILD\"
  }")
  parse_response "$RAW"
  assert_status 409 "Duplicate SKU rejected"
fi

print_test "POST /api/products — invalid vendor (should fail 404)"
if [[ -z "$CATEGORY_ID_CHILD" ]]; then skip "No category ID"; else
  RAW=$(call POST "$API/products" "{
    \"productID\": \"TEST-001\",
    \"sku\": \"TEST-SKU-001\",
    \"name\": \"Test Product\",
    \"description\": \"Bad vendor.\",
    \"price\": 1.00,
    \"vendorId\": \"fake_vendor_id\",
    \"categoryId\": \"$CATEGORY_ID_CHILD\"
  }")
  parse_response "$RAW"
  assert_status 404 "Invalid vendor rejected"
fi

# ── GET /api/products ─────────────────────────────────────────────────────────
print_test "GET /api/products — list all products"
RAW=$(call GET "$API/products")
parse_response "$RAW"
assert_status 200 "List products"

print_test "GET /api/products?vendorId= — filter by vendor"
if [[ -n "$VENDOR_ID" ]]; then
  RAW=$(call GET "$API/products?vendorId=$VENDOR_ID")
  parse_response "$RAW"
  assert_status 200 "Filter by vendor"
fi

print_test "GET /api/products?categoryId= — filter by category"
if [[ -n "$CATEGORY_ID_CHILD" ]]; then
  RAW=$(call GET "$API/products?categoryId=$CATEGORY_ID_CHILD")
  parse_response "$RAW"
  assert_status 200 "Filter by category"
fi

print_test "GET /api/products?minPrice=2&maxPrice=5 — filter by price range"
RAW=$(call GET "$API/products?minPrice=2&maxPrice=5")
parse_response "$RAW"
assert_status 200 "Filter by price range"

print_test "GET /api/products?search=biscuit — full-text search"
RAW=$(call GET "$API/products?search=biscuit")
parse_response "$RAW"
assert_status 200 "Search products"

print_test "GET /api/products?sortBy=price&sortOrder=asc — sort"
RAW=$(call GET "$API/products?sortBy=price&sortOrder=asc")
parse_response "$RAW"
assert_status 200 "Sort products by price"

# ── GET /api/products/:id ─────────────────────────────────────────────────────
print_test "GET /api/products/:id — fetch product 1"
if [[ -z "$PRODUCT_ID" ]]; then skip "No product ID"; else
  RAW=$(call GET "$API/products/$PRODUCT_ID")
  parse_response "$RAW"
  assert_status 200 "Fetch product by ID"
fi

# ── PUT /api/products/:id ─────────────────────────────────────────────────────
print_test "PUT /api/products/:id — update price and stock"
if [[ -z "$PRODUCT_ID" ]]; then skip "No product ID"; else
  RAW=$(call PUT "$API/products/$PRODUCT_ID" '{
    "price": 5.49,
    "stockQuantity": 200,
    "description": "Classic butter biscuits made with real cream. Now in a larger 200g pack — updated recipe!"
  }')
  parse_response "$RAW"
  assert_status 200 "Update product price and stock"
fi

print_test "PUT /api/products/:id — steal another product SKU (should fail 409)"
if [[ -z "$PRODUCT_ID" ]]; then skip "No product ID"; else
  RAW=$(call PUT "$API/products/$PRODUCT_ID" '{"sku": "GG-CRAK-SEA-100G"}')
  parse_response "$RAW"
  assert_status 409 "Duplicate SKU on update rejected"
fi

# =============================================================================
# ORDERS
# =============================================================================

print_header "ORDERS"

# ── POST /api/orders ──────────────────────────────────────────────────────────
print_test "POST /api/orders — create order with 2 items"
if [[ -z "$PRODUCT_ID" || -z "$PRODUCT_ID_2" ]]; then skip "Missing product IDs"; else
  RAW=$(call POST "$API/orders" "{
    \"userWallet\": \"0x1234567890ABCDEF1234567890ABCDEF12345678\",
    \"items\": [
      { \"productId\": \"$PRODUCT_ID\",   \"quantity\": 3 },
      { \"productId\": \"$PRODUCT_ID_2\",  \"quantity\": 2 }
    ]
  }")
  parse_response "$RAW"
  if assert_status 201 "Create order"; then
    ORDER_ID=$(json_get "$BODY" "id")
    info "Order ID: $ORDER_ID"
    # Grab first order item id
    ORDER_ITEM_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -2 | tail -1 | sed 's/"id":"//;s/"//')
    info "Order Item ID (sample): $ORDER_ITEM_ID"
  fi
fi

print_test "POST /api/orders — exceed stock (should fail 409)"
if [[ -z "$PRODUCT_ID" ]]; then skip "No product ID"; else
  RAW=$(call POST "$API/orders" "{
    \"items\": [{ \"productId\": \"$PRODUCT_ID\", \"quantity\": 99999 }]
  }")
  parse_response "$RAW"
  assert_status 409 "Exceeding stock rejected"
fi

print_test "POST /api/orders — empty items array (should fail 400)"
RAW=$(call POST "$API/orders" '{"items": []}')
parse_response "$RAW"
assert_status 400 "Empty items array rejected"

print_test "POST /api/orders — invalid productId in items (should fail 404)"
RAW=$(call POST "$API/orders" '{"items": [{"productId": "fake_prod_id", "quantity": 1}]}')
parse_response "$RAW"
assert_status 404 "Invalid product in order rejected"

# ── GET /api/orders ───────────────────────────────────────────────────────────
print_test "GET /api/orders — list all orders"
RAW=$(call GET "$API/orders")
parse_response "$RAW"
assert_status 200 "List orders"

print_test "GET /api/orders?status=PENDING — filter by status"
RAW=$(call GET "$API/orders?status=PENDING")
parse_response "$RAW"
assert_status 200 "Filter orders by status"

print_test "GET /api/orders?userWallet= — filter by wallet"
RAW=$(call GET "$API/orders?userWallet=0x1234567890ABCDEF1234567890ABCDEF12345678")
parse_response "$RAW"
assert_status 200 "Filter orders by wallet"

# ── GET /api/orders/:id ───────────────────────────────────────────────────────
print_test "GET /api/orders/:id — fetch order"
if [[ -z "$ORDER_ID" ]]; then skip "No order ID"; else
  RAW=$(call GET "$API/orders/$ORDER_ID")
  parse_response "$RAW"
  assert_status 200 "Fetch order by ID"
fi

# ── PUT /api/orders/:id — status transitions ──────────────────────────────────
print_test "PUT /api/orders/:id — PENDING → PROCESSING"
if [[ -z "$ORDER_ID" ]]; then skip "No order ID"; else
  RAW=$(call PUT "$API/orders/$ORDER_ID" '{"status": "PROCESSING"}')
  parse_response "$RAW"
  assert_status 200 "Transition to PROCESSING"
fi

print_test "PUT /api/orders/:id — PROCESSING → PENDING (illegal, should fail 400)"
if [[ -z "$ORDER_ID" ]]; then skip "No order ID"; else
  RAW=$(call PUT "$API/orders/$ORDER_ID" '{"status": "PENDING"}')
  parse_response "$RAW"
  assert_status 400 "Illegal status rollback rejected"
fi

print_test "PUT /api/orders/:id — set txHash"
if [[ -z "$ORDER_ID" ]]; then skip "No order ID"; else
  RAW=$(call PUT "$API/orders/$ORDER_ID" '{
    "txHash": "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1"
  }')
  parse_response "$RAW"
  assert_status 200 "Set txHash on order"
fi

print_test "PUT /api/orders/:id — overwrite txHash (should fail 409)"
if [[ -z "$ORDER_ID" ]]; then skip "No order ID"; else
  RAW=$(call PUT "$API/orders/$ORDER_ID" '{"txHash": "0xdifferenthash"}')
  parse_response "$RAW"
  assert_status 409 "txHash overwrite rejected"
fi

print_test "PUT /api/orders/:id — PROCESSING → PAID"
if [[ -z "$ORDER_ID" ]]; then skip "No order ID"; else
  RAW=$(call PUT "$API/orders/$ORDER_ID" '{"status": "PAID"}')
  parse_response "$RAW"
  assert_status 200 "Transition to PAID"
fi

print_test "PUT /api/orders/:id — PAID → SHIPPED"
if [[ -z "$ORDER_ID" ]]; then skip "No order ID"; else
  RAW=$(call PUT "$API/orders/$ORDER_ID" '{"status": "SHIPPED"}')
  parse_response "$RAW"
  assert_status 200 "Transition to SHIPPED"
fi

print_test "PUT /api/orders/:id — SHIPPED → DELIVERED"
if [[ -z "$ORDER_ID" ]]; then skip "No order ID"; else
  RAW=$(call PUT "$API/orders/$ORDER_ID" '{"status": "DELIVERED"}')
  parse_response "$RAW"
  assert_status 200 "Transition to DELIVERED"
fi

print_test "PUT /api/orders/:id — DELIVERED → anything (should fail 400)"
if [[ -z "$ORDER_ID" ]]; then skip "No order ID"; else
  RAW=$(call PUT "$API/orders/$ORDER_ID" '{"status": "CANCELLED"}')
  parse_response "$RAW"
  assert_status 400 "No transitions from DELIVERED rejected"
fi

# =============================================================================
# ORDER ITEMS
# =============================================================================

print_header "ORDER ITEMS"
# Create a fresh PENDING order to test item edits (previous order is DELIVERED)
print_test "POST /api/orders — create a second PENDING order for item tests"
if [[ -z "$PRODUCT_ID" || -z "$PRODUCT_ID_2" ]]; then skip "Missing product IDs"; else
  RAW=$(call POST "$API/orders" "{
    \"userWallet\": \"0xAABBCCDDEEFF00112233445566778899AABBCCDD\",
    \"items\": [
      { \"productId\": \"$PRODUCT_ID\",  \"quantity\": 2 },
      { \"productId\": \"$PRODUCT_ID_2\", \"quantity\": 1 }
    ]
  }")
  parse_response "$RAW"
  if assert_status 201 "Create second order (PENDING)"; then
    PENDING_ORDER_ID=$(json_get "$BODY" "id")
    # Grab the first item id from this new order
    ORDER_ITEM_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -2 | tail -1 | sed 's/"id":"//;s/"//')
    info "Pending Order ID: $PENDING_ORDER_ID"
    info "Order Item ID: $ORDER_ITEM_ID"
  fi
fi

# ── GET /api/order-items/:id ──────────────────────────────────────────────────
print_test "GET /api/order-items/:id — fetch order item"
if [[ -z "$ORDER_ITEM_ID" ]]; then skip "No order item ID"; else
  RAW=$(call GET "$API/order-items/$ORDER_ITEM_ID")
  parse_response "$RAW"
  assert_status 200 "Fetch order item by ID"
fi

# ── PUT /api/order-items/:id ──────────────────────────────────────────────────
print_test "PUT /api/order-items/:id — update quantity"
if [[ -z "$ORDER_ITEM_ID" ]]; then skip "No order item ID"; else
  RAW=$(call PUT "$API/order-items/$ORDER_ITEM_ID" '{"quantity": 5}')
  parse_response "$RAW"
  assert_status 200 "Update order item quantity"
fi

print_test "PUT /api/order-items/:id — invalid quantity 0 (should fail 400)"
if [[ -z "$ORDER_ITEM_ID" ]]; then skip "No order item ID"; else
  RAW=$(call PUT "$API/order-items/$ORDER_ITEM_ID" '{"quantity": 0}')
  parse_response "$RAW"
  assert_status 400 "Zero quantity rejected"
fi

print_test "PUT /api/order-items/:id — exceed stock (should fail 409)"
if [[ -z "$ORDER_ITEM_ID" ]]; then skip "No order item ID"; else
  RAW=$(call PUT "$API/order-items/$ORDER_ITEM_ID" '{"quantity": 99999}')
  parse_response "$RAW"
  assert_status 409 "Over-stock quantity rejected"
fi

# ── DELETE /api/order-items/:id ───────────────────────────────────────────────
print_test "DELETE /api/order-items/:id — remove one item from pending order"
if [[ -z "$ORDER_ITEM_ID" ]]; then skip "No order item ID"; else
  RAW=$(call DELETE "$API/order-items/$ORDER_ITEM_ID")
  parse_response "$RAW"
  assert_status 200 "Remove order item"
fi

# =============================================================================
# DELETE (order first, then products → categories → vendors)
# =============================================================================

print_header "CLEANUP / DELETE (reverse dependency order)"

print_test "DELETE /api/orders/:id — delete the PENDING order"
if [[ -z "$PENDING_ORDER_ID" ]]; then skip "No pending order ID"; else
  RAW=$(call DELETE "$API/orders/$PENDING_ORDER_ID")
  parse_response "$RAW"
  assert_status 200 "Delete pending order (stock restored)"
fi

print_test "DELETE /api/orders/:id — try deleting a DELIVERED order (should fail 409)"
if [[ -z "$ORDER_ID" ]]; then skip "No order ID"; else
  RAW=$(call DELETE "$API/orders/$ORDER_ID")
  parse_response "$RAW"
  assert_status 409 "Delete non-pending order rejected"
fi

print_test "DELETE /api/products/:id — delete product 2"
if [[ -z "$PRODUCT_ID_2" ]]; then skip "No product 2 ID"; else
  RAW=$(call DELETE "$API/products/$PRODUCT_ID_2")
  parse_response "$RAW"
  # May fail if still referenced by the DELIVERED order items — that's expected
  if [[ "$HTTP_CODE" == "200" ]]; then
    pass "Delete product 2 (HTTP 200)"
  elif [[ "$HTTP_CODE" == "409" ]]; then
    pass "Delete product 2 blocked by order items (HTTP 409 — expected)"
  else
    fail "Delete product 2 — unexpected HTTP $HTTP_CODE"
  fi
fi

print_test "DELETE /api/categories/:id — try deleting parent while child exists (should fail 409)"
if [[ -z "$CATEGORY_ID" ]]; then skip "No category ID"; else
  RAW=$(call DELETE "$API/categories/$CATEGORY_ID")
  parse_response "$RAW"
  assert_status 409 "Delete parent category with children rejected"
fi

print_test "DELETE /api/categories/:id — delete child category"
if [[ -z "$CATEGORY_ID_CHILD" ]]; then skip "No child category ID"; else
  # Child has products from the delivered order, this may 409
  RAW=$(call DELETE "$API/categories/$CATEGORY_ID_CHILD")
  parse_response "$RAW"
  if [[ "$HTTP_CODE" == "200" ]]; then
    pass "Delete child category (HTTP 200)"
  elif [[ "$HTTP_CODE" == "409" ]]; then
    pass "Delete child category blocked by products (HTTP 409 — expected)"
  else
    fail "Delete child category — unexpected HTTP $HTTP_CODE"
  fi
fi

print_test "DELETE /api/vendors/:id — try deleting vendor with products (should fail 409)"
if [[ -z "$VENDOR_ID" ]]; then skip "No vendor ID"; else
  RAW=$(call DELETE "$API/vendors/$VENDOR_ID")
  parse_response "$RAW"
  assert_status 409 "Delete vendor with products rejected"
fi

# =============================================================================
# Summary
# =============================================================================

TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo -e "${BOLD}${BLUE}════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  TEST SUMMARY${RESET}"
echo -e "${BOLD}${BLUE}════════════════════════════════════════════════════════${RESET}"
echo -e "  Total  : ${BOLD}$TOTAL${RESET}"
echo -e "  ${GREEN}Passed : $PASS${RESET}"
echo -e "  ${RED}Failed : $FAIL${RESET}"
echo -e "  ${YELLOW}Skipped: $SKIP${RESET}"
echo ""
if [[ $FAIL -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}All tests passed! 🎉${RESET}"
else
  echo -e "  ${RED}${BOLD}$FAIL test(s) failed. Check output above for details.${RESET}"
fi
echo ""