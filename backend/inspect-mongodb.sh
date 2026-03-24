#!/bin/bash

# MongoDB Chat Data Inspector
# Detailed inspection of chat-related MongoDB documents

set -e

# Configuration
MONGODB_CONTAINER="${MONGODB_CONTAINER:-unistay_mongodb}"
MONGODB_DATABASE="${MONGODB_DATABASE:-unistay_db}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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

# Check if container is running
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${MONGODB_CONTAINER}$"; then
        print_error "MongoDB container '$MONGODB_CONTAINER' is not running"
        print_info "Start it with: docker compose up -d mongodb"
        exit 1
    fi
    print_success "MongoDB container is running"
}

# Get MongoDB shell command
get_mongo_cmd() {
    if docker exec "$MONGODB_CONTAINER" which mongosh &>/dev/null; then
        echo "mongosh"
    elif docker exec "$MONGODB_CONTAINER" which mongo &>/dev/null; then
        echo "mongo"
    else
        print_error "No MongoDB shell found in container"
        exit 1
    fi
}

# Execute MongoDB query
mongo_query() {
    local query="$1"
    local mongo_cmd=$(get_mongo_cmd)
    docker exec "$MONGODB_CONTAINER" $mongo_cmd "$MONGODB_DATABASE" --quiet --eval "$query" 2>/dev/null
}

# 1. Collection Statistics
show_collection_stats() {
    print_header "📊 Collection Statistics"
    
    echo -e "${CYAN}Chat Rooms:${NC}"
    local room_count=$(mongo_query "db.chatrooms.countDocuments()")
    echo "  Total rooms: ${room_count:-0}"
    
    echo -e "\n${CYAN}Chat Messages:${NC}"
    local message_count=$(mongo_query "db.chatmessages.countDocuments()")
    echo "  Total messages: ${message_count:-0}"
    
    echo -e "\n${CYAN}Users:${NC}"
    local student_count=$(mongo_query "db.users.countDocuments({role: 'STUDENT'})")
    local owner_count=$(mongo_query "db.users.countDocuments({role: 'OWNER'})")
    echo "  Students: ${student_count:-0}"
    echo "  Owners: ${owner_count:-0}"
}

# 2. Chat Rooms Overview
show_chat_rooms() {
    print_header "🏠 Chat Rooms Overview"
    
    mongo_query '
        db.chatrooms.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "participants.student",
                    foreignField: "_id",
                    as: "student"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "participants.owner",
                    foreignField: "_id",
                    as: "owner"
                }
            },
            {
                $lookup: {
                    from: "boardings",
                    localField: "boardingId",
                    foreignField: "_id",
                    as: "boarding"
                }
            },
            {
                $project: {
                    _id: 1,
                    "student.firstName": 1,
                    "student.lastName": 1,
                    "student.email": 1,
                    "owner.firstName": 1,
                    "owner.lastName": 1,
                    "owner.email": 1,
                    "boarding.propertyName": 1,
                    lastMessageAt: 1,
                    isActive: 1,
                    createdAt: 1
                }
            },
            { $sort: { lastMessageAt: -1 } },
            { $limit: 10 }
        ]).forEach(function(room) {
            print("\n" + JSON.stringify(room, null, 2));
        })
    '
}

# 3. Recent Messages
show_recent_messages() {
    print_header "💬 Recent Messages"
    
    mongo_query '
        db.chatmessages.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "senderId",
                    foreignField: "_id",
                    as: "sender"
                }
            },
            {
                $lookup: {
                    from: "chatrooms",
                    localField: "roomId",
                    foreignField: "_id",
                    as: "room"
                }
            },
            {
                $project: {
                    content: 1,
                    messageType: 1,
                    isRead: 1,
                    readAt: 1,
                    createdAt: 1,
                    "sender.firstName": 1,
                    "sender.lastName": 1,
                    "sender.role": 1,
                    roomId: 1
                }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 }
        ]).forEach(function(msg) {
            print("\n" + JSON.stringify(msg, null, 2));
        })
    '
}

# 4. Messages by Room
show_messages_by_room() {
    print_header "📋 Messages Grouped by Room"
    
    mongo_query '
        db.chatmessages.aggregate([
            {
                $group: {
                    _id: "$roomId",
                    messageCount: { $sum: 1 },
                    lastMessage: { $max: "$createdAt" },
                    unreadCount: {
                        $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] }
                    }
                }
            },
            {
                $lookup: {
                    from: "chatrooms",
                    localField: "_id",
                    foreignField: "_id",
                    as: "room"
                }
            },
            { $unwind: "$room" },
            {
                $project: {
                    roomId: "$_id",
                    messageCount: 1,
                    unreadCount: 1,
                    lastMessage: 1,
                    "room.isActive": 1
                }
            },
            { $sort: { lastMessage: -1 } },
            { $limit: 10 }
        ]).forEach(function(room) {
            print("\n" + JSON.stringify(room, null, 2));
        })
    '
}

# 5. User Activity
show_user_activity() {
    print_header "👤 User Chat Activity"
    
    mongo_query '
        db.chatmessages.aggregate([
            {
                $group: {
                    _id: "$senderId",
                    messageCount: { $sum: 1 },
                    lastMessage: { $max: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    userId: "$_id",
                    "user.firstName": 1,
                    "user.lastName": 1,
                    "user.role": 1,
                    "user.email": 1,
                    messageCount: 1,
                    lastMessage: 1
                }
            },
            { $sort: { messageCount: -1 } },
            { $limit: 10 }
        ]).forEach(function(user) {
            print("\n" + JSON.stringify(user, null, 2));
        })
    '
}

# 6. Room Indexes
show_indexes() {
    print_header "📑 Database Indexes"
    
    echo -e "${CYAN}ChatRooms Indexes:${NC}"
    mongo_query 'db.chatrooms.getIndexes().forEach(function(idx) { print(JSON.stringify(idx, null, 2)); })'
    
    echo -e "\n${CYAN}ChatMessages Indexes:${NC}"
    mongo_query 'db.chatmessages.getIndexes().forEach(function(idx) { print(JSON.stringify(idx, null, 2)); })'
}

# 7. Sample Documents
show_sample_documents() {
    print_header "📄 Sample Documents"
    
    echo -e "${CYAN}Sample ChatRoom Document:${NC}"
    mongo_query 'db.chatrooms.findOne()' | jq '.' 2>/dev/null || mongo_query 'db.chatrooms.findOne()'
    
    echo -e "\n${CYAN}Sample ChatMessage Document:${NC}"
    mongo_query 'db.chatmessages.findOne()' | jq '.' 2>/dev/null || mongo_query 'db.chatmessages.findOne()'
}

# 8. Database Health
check_database_health() {
    print_header "🏥 Database Health Check"
    
    print_info "Checking database connection..."
    local result=$(mongo_query 'db.runCommand({ping: 1})' 2>&1)
    
    if echo "$result" | grep -q '"ok" : 1'; then
        print_success "Database connection healthy"
    else
        print_error "Database connection issue detected"
        echo "$result"
        return 1
    fi
    
    print_info "Checking collection sizes..."
    mongo_query '
        print("ChatRooms storage: " + db.chatrooms.stats().storageSize + " bytes");
        print("ChatMessages storage: " + db.chatmessages.stats().storageSize + " bytes");
    '
}

# 9. Find Specific Room
find_room() {
    local user_id="$1"
    
    print_header "🔍 Finding Rooms for User: $user_id"
    
    mongo_query "
        db.chatrooms.find({
            \$or: [
                { 'participants.student': ObjectId('$user_id') },
                { 'participants.owner': ObjectId('$user_id') }
            ]
        }).limit(10).toArray()
    " | jq '.' 2>/dev/null || mongo_query "
        db.chatrooms.find({
            \$or: [
                { 'participants.student': ObjectId('$user_id') },
                { 'participants.owner': ObjectId('$user_id') }
            ]
        }).limit(10)
    "
}

# 10. Cleanup Test Data
cleanup_test_data() {
    print_header "🧹 Cleanup Test Data"
    
    read -p "Are you sure you want to delete all chat rooms and messages? (y/N) " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        mongo_query 'db.chatrooms.deleteMany({})'
        print_success "All chat rooms deleted"
        
        mongo_query 'db.chatmessages.deleteMany({})'
        print_success "All chat messages deleted"
    else
        print_info "Cleanup cancelled"
    fi
}

# Main menu
show_menu() {
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   MongoDB Chat Data Inspector          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "1. Collection Statistics"
    echo "2. Chat Rooms Overview"
    echo "3. Recent Messages"
    echo "4. Messages by Room"
    echo "5. User Activity"
    echo "6. Database Indexes"
    echo "7. Sample Documents"
    echo "8. Database Health Check"
    echo "9. Find Room by User ID"
    echo "10. Cleanup Test Data"
    echo "11. Show All (1-8)"
    echo "0. Exit"
    echo ""
}

# Run all inspections
run_all() {
    check_container
    show_collection_stats
    show_chat_rooms
    show_recent_messages
    show_messages_by_room
    show_user_activity
    show_indexes
    show_sample_documents
    check_database_health
}

# Interactive mode
interactive() {
    check_container
    
    while true; do
        show_menu
        read -p "Select option: " choice
        case $choice in
            1) show_collection_stats ;;
            2) show_chat_rooms ;;
            3) show_recent_messages ;;
            4) show_messages_by_room ;;
            5) show_user_activity ;;
            6) show_indexes ;;
            7) show_sample_documents ;;
            8) check_database_health ;;
            9)
                read -p "Enter User ID: " user_id
                find_room "$user_id"
                ;;
            10) cleanup_test_data ;;
            11) run_all ;;
            0) exit 0 ;;
            *) print_error "Invalid option" ;;
        esac
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Show usage
show_usage() {
    echo "MongoDB Chat Data Inspector"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  stats       Show collection statistics"
    echo "  rooms       Show chat rooms overview"
    echo "  messages    Show recent messages"
    echo "  activity    Show user activity"
    echo "  indexes     Show database indexes"
    echo "  samples     Show sample documents"
    echo "  health      Check database health"
    echo "  all         Run all inspections (default)"
    echo "  interactive Interactive menu mode"
    echo "  help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  MONGODB_CONTAINER  Container name (default: unistay_mongodb)"
    echo "  MONGODB_DATABASE   Database name (default: unistay_db)"
    echo ""
}

# Check container first
check_container

# Parse command line arguments
case "${1:-all}" in
    stats)
        show_collection_stats
        ;;
    rooms)
        show_chat_rooms
        ;;
    messages)
        show_recent_messages
        ;;
    activity)
        show_user_activity
        ;;
    indexes)
        show_indexes
        ;;
    samples)
        show_sample_documents
        ;;
    health)
        check_database_health
        ;;
    all)
        run_all
        ;;
    interactive)
        interactive
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
