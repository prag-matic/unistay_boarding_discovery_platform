#!/bin/bash

# UniStay Boarding Discovery Platform - Full Flow Test Script
# Tests: Registration → Boarding → Reservation → Payment → Review

set -e

# Configuration
BASE_URL="${API_URL:-http://localhost:3000}"
API_ENDPOINT="${BASE_URL}/api"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Store IDs and tokens
STUDENT_EMAIL=""
STUDENT_PASSWORD="TestPass123!"
STUDENT_TOKEN=""
OWNER_EMAIL=""
OWNER_PASSWORD="TestPass123!"
OWNER_TOKEN=""
BOARDING_ID=""
BOARDING_SLUG=""
RESERVATION_ID=""
PAYMENT_ID=""
REVIEW_ID=""

# Helper functions
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "${CYAN}▶ Step:${NC} $1"
}

print_test() {
    echo -e "${YELLOW}→ Testing:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((TESTS_PASSED++)) || true
}

print_failure() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((TESTS_FAILED++)) || true
}

generate_random_id() {
    echo "$(date +%s)_$(( RANDOM % 10000 ))"
}

extract_json_value() {
    echo "$1" | jq -r "$2" 2>/dev/null || echo ""
}

# =============================================================================
# SETUP: Generate test user emails
# =============================================================================
print_header "🚀 UniStay Full Flow Test Suite"
echo -e "Base URL: ${GREEN}${BASE_URL}${NC}"

RANDOM_ID=$(generate_random_id)
STUDENT_EMAIL="student_${RANDOM_ID}@test.com"
OWNER_EMAIL="owner_${RANDOM_ID}@test.com"

echo -e "${YELLOW}Test Student Email:${NC} ${STUDENT_EMAIL}"
echo -e "${YELLOW}Test Owner Email:${NC} ${OWNER_EMAIL}\n"

# =============================================================================
# PHASE 1: USER REGISTRATION & AUTHENTICATION
# =============================================================================
print_header "📝 Phase 1: User Registration & Authentication"

# 1.1 Register Student
print_step "Register Student User"
STUDENT_REG_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${STUDENT_EMAIL}\",
        \"password\": \"${STUDENT_PASSWORD}\",
        \"firstName\": \"John\",
        \"lastName\": \"Student\",
        \"role\": \"STUDENT\",
        \"phone\": \"+94771234567\",
        \"university\": \"University of Colombo\"
    }")

STUDENT_REG_STATUS=$(echo "$STUDENT_REG_RESPONSE" | jq -r '.message' 2>/dev/null || echo "")
if [[ "$STUDENT_REG_STATUS" == *"Registration successful"* ]]; then
    print_success "Student registered successfully"
else
    print_failure "Student registration failed: $STUDENT_REG_STATUS"
fi

# 1.2 Register Owner
print_step "Register Owner User"
OWNER_REG_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${OWNER_EMAIL}\",
        \"password\": \"${OWNER_PASSWORD}\",
        \"firstName\": \"Jane\",
        \"lastName\": \"Owner\",
        \"role\": \"OWNER\",
        \"phone\": \"+94777654321\"
    }")

OWNER_REG_STATUS=$(echo "$OWNER_REG_RESPONSE" | jq -r '.message' 2>/dev/null || echo "")
if [[ "$OWNER_REG_STATUS" == *"Registration successful"* ]]; then
    print_success "Owner registered successfully"
else
    print_failure "Owner registration failed: $OWNER_REG_STATUS"
fi

# 1.3 Login Student
print_step "Student Login"
STUDENT_LOGIN_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${STUDENT_EMAIL}\",
        \"password\": \"${STUDENT_PASSWORD}\"
    }")

STUDENT_TOKEN=$(extract_json_value "$STUDENT_LOGIN_RESPONSE" ".data.accessToken")
if [ -n "$STUDENT_TOKEN" ] && [ "$STUDENT_TOKEN" != "null" ]; then
    print_success "Student logged in, token received"
else
    print_failure "Student login failed"
    echo "Response: $STUDENT_LOGIN_RESPONSE"
fi

# 1.4 Login Owner
print_step "Owner Login"
OWNER_LOGIN_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${OWNER_EMAIL}\",
        \"password\": \"${OWNER_PASSWORD}\"
    }")

OWNER_TOKEN=$(extract_json_value "$OWNER_LOGIN_RESPONSE" ".data.accessToken")
if [ -n "$OWNER_TOKEN" ] && [ "$OWNER_TOKEN" != "null" ]; then
    print_success "Owner logged in, token received"
else
    print_failure "Owner login failed"
    echo "Response: $OWNER_LOGIN_RESPONSE"
fi

# =============================================================================
# PHASE 2: BOARDING CREATION (OWNER)
# =============================================================================
print_header "🏠 Phase 2: Boarding Creation"

# 2.1 Create Boarding
print_step "Create New Boarding Listing"
BOARDING_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/boarding" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -d "{
        \"title\": \"Cozy Room Near University\",
        \"description\": \"A comfortable and affordable room perfect for students. Located just 5 minutes walk from the university campus. Includes all amenities.\",
        \"type\": \"ROOM\",
        \"city\": \"Colombo\",
        \"district\": \"Colombo 7\",
        \"address\": \"123 University Avenue\",
        \"latitude\": 6.9271,
        \"longitude\": 79.8612,
        \"rent\": 25000,
        \"maxOccupants\": 2,
        \"bedrooms\": 1,
        \"bathrooms\": 1,
        \"balconies\": 0,
        \"amenities\": [\"WIFI\", \"LAUNDRY\", \"PARKING\", \"SECURITY\"],
        \"availableFrom\": \"2025-04-01\",
        \"rentalPeriod\": \"MONTHLY\",
        \"genderPreference\": \"ANY\"
    }")

BOARDING_ID=$(extract_json_value "$BOARDING_RESPONSE" ".data.boarding._id")
BOARDING_SLUG=$(extract_json_value "$BOARDING_RESPONSE" ".data.boarding.slug")
BOARDING_STATUS=$(extract_json_value "$BOARDING_RESPONSE" ".data.boarding.status")

if [ -n "$BOARDING_ID" ] && [ "$BOARDING_ID" != "null" ]; then
    print_success "Boarding created successfully"
    echo -e "   ${CYAN}ID:${NC} $BOARDING_ID"
    echo -e "   ${CYAN}Slug:${NC} $BOARDING_SLUG"
    echo -e "   ${CYAN}Status:${NC} $BOARDING_STATUS"
else
    print_failure "Boarding creation failed"
    echo "Response: $BOARDING_RESPONSE"
fi

# 2.2 Submit Boarding for Approval
print_step "Submit Boarding for Approval"
SUBMIT_RESPONSE=$(curl -s -X PATCH "${API_ENDPOINT}/boarding/${BOARDING_ID}/submit" \
    -H "Authorization: Bearer ${OWNER_TOKEN}")

SUBMIT_STATUS=$(extract_json_value "$SUBMIT_RESPONSE" ".data.boarding.status")
if [ "$SUBMIT_STATUS" == "PENDING_APPROVAL" ]; then
    print_success "Boarding submitted for approval"
else
    print_failure "Boarding submission failed"
    echo "Response: $SUBMIT_RESPONSE"
fi

# 2.3 Search Boardings (Student)
print_step "Search Boardings (Student)"
SEARCH_RESPONSE=$(curl -s -X GET "${API_ENDPOINT}/boarding?city=Colombo&status=ACTIVE" \
    -H "Authorization: Bearer ${STUDENT_TOKEN}")

SEARCH_COUNT=$(extract_json_value "$SEARCH_RESPONSE" ".data.boardings | length")
print_success "Found $SEARCH_COUNT boarding(s) in search results"

# 2.4 Get Boarding by Slug
print_step "Get Boarding Details by Slug"
BOARDING_DETAIL_RESPONSE=$(curl -s -X GET "${API_ENDPOINT}/boarding/${BOARDING_SLUG}" \
    -H "Authorization: Bearer ${STUDENT_TOKEN}")

RETRIEVED_SLUG=$(extract_json_value "$BOARDING_DETAIL_RESPONSE" ".data.boarding.slug")
if [ "$RETRIEVED_SLUG" == "$BOARDING_SLUG" ]; then
    print_success "Boarding details retrieved successfully"
else
    print_failure "Failed to retrieve boarding details"
fi

# =============================================================================
# PHASE 3: RESERVATION (STUDENT)
# =============================================================================
print_header "📅 Phase 3: Reservation Process"

# 3.1 Create Reservation
print_step "Student Creates Reservation"
RESERVATION_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/reservation" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${STUDENT_TOKEN}" \
    -d "{
        \"boardingId\": \"${BOARDING_ID}\",
        \"moveInDate\": \"2025-04-01\",
        \"specialRequests\": \"Would prefer a quiet room\"
    }")

RESERVATION_ID=$(extract_json_value "$RESERVATION_RESPONSE" ".data.reservation._id")
RESERVATION_STATUS=$(extract_json_value "$RESERVATION_RESPONSE" ".data.reservation.status")

if [ -n "$RESERVATION_ID" ] && [ "$RESERVATION_ID" != "null" ]; then
    print_success "Reservation created successfully"
    echo -e "   ${CYAN}ID:${NC} $RESERVATION_ID"
    echo -e "   ${CYAN}Status:${NC} $RESERVATION_STATUS"
else
    print_failure "Reservation creation failed"
    echo "Response: $RESERVATION_RESPONSE"
fi

# 3.2 Get My Reservations (Student)
print_step "Get Student's Reservations"
MY_RESERVATIONS_RESPONSE=$(curl -s -X GET "${API_ENDPOINT}/reservation/my-requests" \
    -H "Authorization: Bearer ${STUDENT_TOKEN}")

MY_RES_COUNT=$(extract_json_value "$MY_RESERVATIONS_RESPONSE" ".data.reservations | length")
print_success "Student has $MY_RES_COUNT reservation(s)"

# 3.3 Get Boarding Requests (Owner)
print_step "Get Owner's Boarding Requests"
OWNER_REQUESTS_RESPONSE=$(curl -s -X GET "${API_ENDPOINT}/reservation/my-boardings" \
    -H "Authorization: Bearer ${OWNER_TOKEN}")

OWNER_REQ_COUNT=$(extract_json_value "$OWNER_REQUESTS_RESPONSE" ".data.reservations | length")
print_success "Owner has $OWNER_REQ_COUNT reservation request(s)"

# 3.4 Approve Reservation
print_step "Owner Approves Reservation"
APPROVE_RESPONSE=$(curl -s -X PATCH "${API_ENDPOINT}/reservation/${RESERVATION_ID}/approve" \
    -H "Authorization: Bearer ${OWNER_TOKEN}")

APPROVED_STATUS=$(extract_json_value "$APPROVE_RESPONSE" ".data.reservation.status")
if [ "$APPROVED_STATUS" == "ACTIVE" ]; then
    print_success "Reservation approved successfully"
else
    print_failure "Reservation approval failed"
    echo "Response: $APPROVE_RESPONSE"
fi

# =============================================================================
# PHASE 4: PAYMENT (STUDENT)
# =============================================================================
print_header "💳 Phase 4: Payment Process"

# 4.1 Log Payment (Student)
print_step "Student Logs Payment"
PAYMENT_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/payment" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${STUDENT_TOKEN}" \
    -d "{
        \"reservationId\": \"${RESERVATION_ID}\",
        \"amount\": 25000,
        \"paymentMethod\": \"BANK_TRANSFER\",
        \"referenceNumber\": \"REF${RANDOM_ID}\",
        \"paidAt\": \"$(date -Iseconds)\"
    }")

PAYMENT_ID=$(extract_json_value "$PAYMENT_RESPONSE" ".data.payment._id")
PAYMENT_STATUS=$(extract_json_value "$PAYMENT_RESPONSE" ".data.payment.status")

if [ -n "$PAYMENT_ID" ] && [ "$PAYMENT_ID" != "null" ]; then
    print_success "Payment logged successfully"
    echo -e "   ${CYAN}ID:${NC} $PAYMENT_ID"
    echo -e "   ${CYAN}Status:${NC} $PAYMENT_STATUS"
else
    print_failure "Payment logging failed"
    echo "Response: $PAYMENT_RESPONSE"
fi

# 4.2 Get My Payments (Student)
print_step "Get Student's Payments"
MY_PAYMENTS_RESPONSE=$(curl -s -X GET "${API_ENDPOINT}/payment/my-payments" \
    -H "Authorization: Bearer ${STUDENT_TOKEN}")

MY_PAY_COUNT=$(extract_json_value "$MY_PAYMENTS_RESPONSE" ".data.payments | length")
print_success "Student has $MY_PAY_COUNT payment(s)"

# 4.3 Get Boarding Payments (Owner)
print_step "Get Owner's Boarding Payments"
OWNER_PAYMENTS_RESPONSE=$(curl -s -X GET "${API_ENDPOINT}/payment/my-boardings" \
    -H "Authorization: Bearer ${OWNER_TOKEN}")

OWNER_PAY_COUNT=$(extract_json_value "$OWNER_PAYMENTS_RESPONSE" ".data.payments | length")
print_success "Owner has $OWNER_PAY_COUNT payment(s)"

# 4.4 Confirm Payment (Owner)
print_step "Owner Confirms Payment"
CONFIRM_RESPONSE=$(curl -s -X PATCH "${API_ENDPOINT}/payment/${PAYMENT_ID}/confirm" \
    -H "Authorization: Bearer ${OWNER_TOKEN}")

CONFIRMED_STATUS=$(extract_json_value "$CONFIRM_RESPONSE" ".data.payment.status")
if [ "$CONFIRMED_STATUS" == "APPROVED" ]; then
    print_success "Payment confirmed successfully"
else
    print_failure "Payment confirmation failed"
    echo "Response: $CONFIRM_RESPONSE"
fi

# =============================================================================
# PHASE 5: REVIEW (STUDENT)
# =============================================================================
print_header "⭐ Phase 5: Review System"

# 5.1 Create Review
print_step "Student Creates Review"
REVIEW_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/review" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${STUDENT_TOKEN}" \
    -d "{
        \"boardingId\": \"${BOARDING_ID}\",
        \"reservationId\": \"${RESERVATION_ID}\",
        \"rating\": 5,
        \"title\": \"Excellent Place to Stay!\",
        \"comment\": \"Had a wonderful experience staying here. The room was clean, well-maintained, and the owner was very responsive. Highly recommended for students!\",
        \"pros\": [\"Clean\", \"Good Location\", \"Responsive Owner\", \"Affordable\"],
        \"cons\": [\"Limited Parking\"]
    }")

REVIEW_ID=$(extract_json_value "$REVIEW_RESPONSE" ".data.review._id")
REVIEW_RATING=$(extract_json_value "$REVIEW_RESPONSE" ".data.review.rating")

if [ -n "$REVIEW_ID" ] && [ "$REVIEW_ID" != "null" ]; then
    print_success "Review created successfully"
    echo -e "   ${CYAN}ID:${NC} $REVIEW_ID"
    echo -e "   ${CYAN}Rating:${NC} $REVIEW_RATING/5"
else
    print_failure "Review creation failed"
    echo "Response: $REVIEW_RESPONSE"
fi

# 5.2 Get Reviews by Boarding
print_step "Get Reviews for Boarding"
REVIEWS_RESPONSE=$(curl -s -X GET "${API_ENDPOINT}/review/boarding/${BOARDING_ID}")

REVIEWS_COUNT=$(extract_json_value "$REVIEWS_RESPONSE" ".data.reviews | length")
print_success "Found $REVIEWS_COUNT review(s) for boarding"

# 5.3 Get Review Statistics
print_step "Get Review Statistics"
STATS_RESPONSE=$(curl -s -X GET "${API_ENDPOINT}/review/boarding/${BOARDING_ID}/stats")

AVG_RATING=$(extract_json_value "$STATS_RESPONSE" ".data.stats.averageRating")
TOTAL_REVIEWS=$(extract_json_value "$STATS_RESPONSE" ".data.stats.totalReviews")
print_success "Average Rating: $AVG_RATING/5 (Total: $TOTAL_REVIEWS reviews)"

# 5.4 Add Reaction to Review
print_step "Add Helpful Reaction to Review"
REACTION_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/review/${REVIEW_ID}/reactions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -d "{
        \"type\": \"HELPFUL\"
    }")

REACTION_COUNT=$(extract_json_value "$REACTION_RESPONSE" ".data.review.reactions.helpful | length")
print_success "Review has $REACTION_COUNT helpful reaction(s)"

# 5.5 Create Comment on Review
print_step "Owner Comments on Review"
COMMENT_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/review/${REVIEW_ID}/comments" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -d "{
        \"comment\": \"Thank you for your kind words! We're glad you enjoyed your stay. You're always welcome back!\"
    }")

COMMENT_ID=$(extract_json_value "$COMMENT_RESPONSE" ".data.comment._id")
if [ -n "$COMMENT_ID" ] && [ "$COMMENT_ID" != "null" ]; then
    print_success "Comment added successfully"
else
    print_failure "Comment creation failed"
    echo "Response: $COMMENT_RESPONSE"
fi

# =============================================================================
# SUMMARY
# =============================================================================
print_header "📊 Test Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "Total Tests: ${BLUE}${TOTAL_TESTS}${NC}"
echo -e "Passed:      ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed:      ${RED}${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed successfully!${NC}\n"
    echo -e "${CYAN}Created Resources:${NC}"
    echo -e "  • Student: ${STUDENT_EMAIL}"
    echo -e "  • Owner: ${OWNER_EMAIL}"
    echo -e "  • Boarding: ${BOARDING_ID} (${BOARDING_SLUG})"
    echo -e "  • Reservation: ${RESERVATION_ID}"
    echo -e "  • Payment: ${PAYMENT_ID}"
    echo -e "  • Review: ${REVIEW_ID}\n"
    exit 0
else
    echo -e "\n${RED}⚠️  ${TESTS_FAILED} test(s) failed. Please review the output above.${NC}\n"
    exit 1
fi
