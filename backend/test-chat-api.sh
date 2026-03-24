#!/bin/bash

# Chat API Test Script
# Tests the real-time chat API between boarding owners and students

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000/api}"
APP_URL="${APP_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test credentials (update these with actual test users)
STUDENT_EMAIL="${STUDENT_EMAIL:-student@test.com}"
STUDENT_PASSWORD="${STUDENT_PASSWORD:-Test123!}"
OWNER_EMAIL="${OWNER_EMAIL:-owner@test.com}"
OWNER_PASSWORD="${OWNER_PASSWORD:-Test123!}"

# Global variables for tokens and IDs
STUDENT_TOKEN=""
OWNER_TOKEN=""
CHAT_ROOM_ID=""
MESSAGE_ID=""

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Make HTTP request and capture response
make_request() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    
    local headers=("-H" "Content-Type: application/json")
    if [ -n "$token" ]; then
        headers+=("-H" "Authorization: Bearer $token")
    fi
    
    local response
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "${BASE_URL}${endpoint}" "${headers[@]}")
    elif [ "$method" == "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${endpoint}" "${headers[@]}" -d "$data")
    elif [ "$method" == "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}${endpoint}" "${headers[@]}" -d "$data")
    elif [ "$method" == "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}${endpoint}" "${headers[@]}")
    fi
    
    echo "$response"
}

# Extract value from JSON response
extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

extract_nested_value() {
    local json=$1
    local path=$2
    echo "$json" | jq -r "$path" 2>/dev/null || echo ""
}

# Test 1: Health Check
test_health() {
    print_header "Test 1: Health Check"
    
    local response=$(curl -s "${BASE_URL}/health")
    local status=$(echo "$response" | grep -o '"success":true' || echo "")
    
    if [ -n "$status" ]; then
        print_success "Health check passed"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 0
    else
        print_error "Health check failed"
        echo "$response"
        return 1
    fi
}

# Test 2: Login as Student
test_student_login() {
    print_header "Test 2: Login as Student"
    
    local data="{\"email\":\"$STUDENT_EMAIL\",\"password\":\"$STUDENT_PASSWORD\"}"
    local response=$(make_request "POST" "/auth/login" "" "$data")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        STUDENT_TOKEN=$(echo "$body" | jq -r '.data.tokens.access.token' 2>/dev/null)
        if [ -n "$STUDENT_TOKEN" ] && [ "$STUDENT_TOKEN" != "null" ]; then
            print_success "Student login successful"
            print_info "Token: ${STUDENT_TOKEN:0:50}..."
            return 0
        fi
    fi
    
    print_error "Student login failed (HTTP $http_code)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    print_info "Note: You may need to create test users first"
    return 1
}

# Test 3: Login as Owner
test_owner_login() {
    print_header "Test 3: Login as Owner"
    
    local data="{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\"}"
    local response=$(make_request "POST" "/auth/login" "" "$data")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        OWNER_TOKEN=$(echo "$body" | jq -r '.data.tokens.access.token' 2>/dev/null)
        if [ -n "$OWNER_TOKEN" ] && [ "$OWNER_TOKEN" != "null" ]; then
            print_success "Owner login successful"
            print_info "Token: ${OWNER_TOKEN:0:50}..."
            return 0
        fi
    fi
    
    print_error "Owner login failed (HTTP $http_code)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    print_info "Note: You may need to create test users first"
    return 1
}

# Test 4: Get Current User (Student)
test_get_student_me() {
    print_header "Test 4: Get Current User (Student)"
    
    local response=$(make_request "GET" "/users/me" "$STUDENT_TOKEN" "")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        print_success "Get student profile successful"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        print_error "Get student profile failed (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Test 5: Search for Users (Student searches for Owners)
test_search_users() {
    print_header "Test 5: Search for Users to Chat With"
    
    local response=$(make_request "GET" "/chat/users?role=OWNER" "$STUDENT_TOKEN" "")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        print_success "User search successful"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        print_error "User search failed (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Test 6: Create Chat Room (Student initiates chat with Owner)
test_create_chat_room() {
    print_header "Test 6: Create Chat Room"
    
    # Get owner ID from search results or use a known ID
    local owner_id="${OWNER_ID:-}"
    
    if [ -z "$owner_id" ]; then
        # Try to get owner ID from login response or use default
        print_info "Using owner from environment or searching..."
        local search_response=$(make_request "GET" "/chat/users?role=OWNER" "$STUDENT_TOKEN" "")
        owner_id=$(echo "$search_response" | sed '$d' | jq -r '.data[0]._id' 2>/dev/null)
    fi
    
    if [ -z "$owner_id" ] || [ "$owner_id" == "null" ]; then
        print_error "No owner found to create chat room with"
        return 1
    fi
    
    local data="{\"otherUserId\":\"$owner_id\"}"
    local response=$(make_request "POST" "/chat/rooms" "$STUDENT_TOKEN" "$data")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ] || [ "$http_code" == "201" ]; then
        CHAT_ROOM_ID=$(echo "$body" | jq -r '.data._id' 2>/dev/null)
        print_success "Chat room created/retrieved successfully"
        print_info "Room ID: $CHAT_ROOM_ID"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        print_error "Create chat room failed (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Test 7: Get Chat Rooms
test_get_chat_rooms() {
    print_header "Test 7: Get Chat Rooms"
    
    local response=$(make_request "GET" "/chat/rooms" "$STUDENT_TOKEN" "")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        print_success "Get chat rooms successful"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        print_error "Get chat rooms failed (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Test 8: Get Chat History
test_get_chat_history() {
    print_header "Test 8: Get Chat History"
    
    if [ -z "$CHAT_ROOM_ID" ]; then
        print_error "No chat room ID available"
        return 1
    fi
    
    local response=$(make_request "GET" "/chat/rooms/$CHAT_ROOM_ID/messages" "$STUDENT_TOKEN" "")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        print_success "Get chat history successful"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        print_error "Get chat history failed (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Test 9: Get Specific Chat Room
test_get_chat_room() {
    print_header "Test 9: Get Specific Chat Room"
    
    if [ -z "$CHAT_ROOM_ID" ]; then
        print_error "No chat room ID available"
        return 1
    fi
    
    local response=$(make_request "GET" "/chat/rooms/$CHAT_ROOM_ID" "$STUDENT_TOKEN" "")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        print_success "Get chat room successful"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        print_error "Get chat room failed (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Test 10: Owner accesses the same chat room
test_owner_access_chat_room() {
    print_header "Test 10: Owner Accesses Chat Room"
    
    if [ -z "$CHAT_ROOM_ID" ]; then
        print_error "No chat room ID available"
        return 1
    fi
    
    local response=$(make_request "GET" "/chat/rooms/$CHAT_ROOM_ID" "$OWNER_TOKEN" "")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        print_success "Owner can access the chat room"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        print_error "Owner access failed (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Test 11: Unauthorized access attempt
test_unauthorized_access() {
    print_header "Test 11: Test Unauthorized Access (No Token)"
    
    local response=$(make_request "GET" "/chat/rooms" "" "")
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" == "401" ]; then
        print_success "Unauthorized access correctly blocked"
        return 0
    else
        print_error "Unauthorized access should be blocked (HTTP $http_code)"
        return 1
    fi
}

# Test 12: Mark all messages as read
test_mark_all_read() {
    print_header "Test 12: Mark All Messages as Read"
    
    if [ -z "$CHAT_ROOM_ID" ]; then
        print_error "No chat room ID available"
        return 1
    fi
    
    local response=$(make_request "PUT" "/chat/rooms/$CHAT_ROOM_ID/read-all" "$STUDENT_TOKEN" "")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        print_success "Mark all as read successful"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        print_error "Mark all as read failed (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Check Docker logs
check_docker_logs() {
    print_header "Docker Logs Check"
    
    print_info "Backend Container Logs (last 50 lines):"
    echo "----------------------------------------"
    docker logs unistay_backend --tail 50 2>/dev/null || print_error "Backend container not found"
    
    echo ""
    print_info "MongoDB Container Logs (last 20 lines):"
    echo "----------------------------------------"
    docker logs unistay_mongodb --tail 20 2>/dev/null || print_error "MongoDB container not found"
}

# Check MongoDB documents
check_mongodb() {
    print_header "MongoDB Documents Check"
    
    print_info "Connecting to MongoDB and checking collections..."
    
    # Check if mongosh is available
    if command -v mongosh &> /dev/null; then
        print_info "Chat Rooms Collection:"
        echo "----------------------------------------"
        docker exec unistay_mongodb mongosh unistay_db --eval "db.chatrooms.find().limit(5).toArray()" 2>/dev/null || print_error "Failed to query chatrooms"
        
        echo ""
        print_info "Chat Messages Collection:"
        echo "----------------------------------------"
        docker exec unistay_mongodb mongosh unistay_db --eval "db.chatmessages.find().limit(5).toArray()" 2>/dev/null || print_error "Failed to query chatmessages"
        
        echo ""
        print_info "Collection Stats:"
        echo "----------------------------------------"
        docker exec unistay_mongodb mongosh unistay_db --eval "
            print('ChatRooms count: ' + db.chatrooms.countDocuments());
            print('ChatMessages count: ' + db.chatmessages.countDocuments());
        " 2>/dev/null || print_error "Failed to get collection stats"
    elif command -v mongo &> /dev/null; then
        print_info "Chat Rooms Collection:"
        echo "----------------------------------------"
        docker exec unistay_mongodb mongo unistay_db --eval "db.chatrooms.find().limit(5).toArray()" 2>/dev/null || print_error "Failed to query chatrooms"
        
        echo ""
        print_info "Chat Messages Collection:"
        echo "----------------------------------------"
        docker exec unistay_mongodb mongo unistay_db --eval "db.chatmessages.find().limit(5).toArray()" 2>/dev/null || print_error "Failed to query chatmessages"
    else
        print_error "Neither mongosh nor mongo client found. Install MongoDB shell to view documents."
        print_info "Alternative: Use Docker exec to connect directly"
    fi
}

# Test Socket.io connection (basic check)
test_socket_io() {
    print_header "Socket.io Connection Test"
    
    print_info "Checking if Socket.io server is running..."
    
    # Check if the port is open
    if command -v nc &> /dev/null; then
        if nc -z localhost 3000 2>/dev/null; then
            print_success "Server port 3000 is open"
        else
            print_error "Server port 3000 is not accessible"
            return 1
        fi
    fi
    
    # Check for Socket.io endpoint
    local response=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/socket.io/?EIO=4&transport=polling")
    if [ "$response" == "200" ] || [ "$response" == "400" ]; then
        print_success "Socket.io endpoint is accessible (HTTP $response)"
        return 0
    else
        print_error "Socket.io endpoint not accessible (HTTP $response)"
        return 1
    fi
}

# Main test runner
run_all_tests() {
    print_header "🧪 Chat API Test Suite"
    print_info "Base URL: $BASE_URL"
    print_info "App URL: $APP_URL"
    
    local passed=0
    local failed=0
    
    # Run tests
    test_health && ((passed++)) || ((failed++))
    test_student_login && ((passed++)) || ((failed++))
    test_owner_login && ((passed++)) || ((failed++))
    
    if [ -n "$STUDENT_TOKEN" ]; then
        test_get_student_me && ((passed++)) || ((failed++))
        test_search_users && ((passed++)) || ((failed++))
        test_create_chat_room && ((passed++)) || ((failed++))
        test_get_chat_rooms && ((passed++)) || ((failed++))
        
        if [ -n "$CHAT_ROOM_ID" ]; then
            test_get_chat_history && ((passed++)) || ((failed++))
            test_get_chat_room && ((passed++)) || ((failed++))
            test_mark_all_read && ((passed++)) || ((failed++))
        fi
    fi
    
    if [ -n "$OWNER_TOKEN" ] && [ -n "$CHAT_ROOM_ID" ]; then
        test_owner_access_chat_room && ((passed++)) || ((failed++))
    fi
    
    test_unauthorized_access && ((passed++)) || ((failed++))
    test_socket_io && ((passed++)) || ((failed++))
    
    # Summary
    print_header "📊 Test Summary"
    print_success "Passed: $passed"
    if [ $failed -gt 0 ]; then
        print_error "Failed: $failed"
    else
        print_info "Failed: $failed"
    fi
    
    # Docker and MongoDB checks
    print_header "🐳 Docker & MongoDB Checks"
    check_docker_logs
    check_mongodb
    
    # Final status
    print_header "✅ Test Suite Complete"
    
    if [ $failed -eq 0 ]; then
        print_success "All tests passed!"
        return 0
    else
        print_error "Some tests failed. Review the output above."
        return 1
    fi
}

# Show usage
show_usage() {
    echo "Chat API Test Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  all          Run all tests (default)"
    echo "  health       Run health check only"
    echo "  login        Test login for both student and owner"
    echo "  chat         Test chat room operations"
    echo "  docker       Check Docker logs"
    echo "  mongodb      Check MongoDB documents"
    echo "  socket       Test Socket.io connection"
    echo "  help         Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  BASE_URL         API base URL (default: http://localhost:3000/api)"
    echo "  APP_URL          App URL (default: http://localhost:3000)"
    echo "  STUDENT_EMAIL    Student test email"
    echo "  STUDENT_PASSWORD Student test password"
    echo "  OWNER_EMAIL      Owner test email"
    echo "  OWNER_PASSWORD   Owner test password"
    echo "  OWNER_ID         Specific owner ID to chat with (optional)"
    echo ""
    echo "Examples:"
    echo "  $0                          # Run all tests"
    echo "  $0 health                   # Run health check"
    echo "  STUDENT_EMAIL=test@example.com $0 login"
}

# Parse command line arguments
case "${1:-all}" in
    all)
        run_all_tests
        ;;
    health)
        test_health
        ;;
    login)
        test_student_login
        test_owner_login
        ;;
    chat)
        test_student_login
        test_owner_login
        test_create_chat_room
        test_get_chat_rooms
        test_get_chat_history
        ;;
    docker)
        check_docker_logs
        ;;
    mongodb)
        check_mongodb
        ;;
    socket)
        test_socket_io
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac
