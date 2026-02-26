#!/usr/bin/env bash

# UniStay Review API Demo Script
# A glamorous shell script to demonstrate the Review API endpoints
# Requires: gum, jq, curl, docker

set -e

# Configuration
BASE_URL="http://localhost:3000/api"
STATE_FILE="state.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors (via gum style or ANSI)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Helper: Print styled message
print_info() {
    gum style --foreground 212 "$1"
}

print_success() {
    gum style --foreground 42 "$1"
}

print_error() {
    gum style --foreground 196 "$1"
}

print_warning() {
    gum style --foreground 214 "$1"
}

print_dim() {
    gum style --foreground 241 "$1"
}

# Helper: Initialize state file
init_state() {
    if [[ ! -f "$STATE_FILE" ]]; then
        cat > "$STATE_FILE" <<EOF
{
  "student_id": null,
  "student_name": null,
  "boarding_id": null,
  "boarding_name": null,
  "review_id": null,
  "comment_ids": []
}
EOF
        print_dim "Initialized state.json"
    fi
}

# Helper: Read state
read_state() {
    cat "$STATE_FILE"
}

# Helper: Update state
update_state() {
    local key="$1"
    local value="$2"
    local current
    current=$(read_state)
    echo "$current" | jq --arg key "$key" --argjson value "$value" '.[$key] = $value' > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
}

# Helper: Get value from state
get_state() {
    local key="$1"
    read_state | jq -r ".$key // empty"
}

# Helper: Check if gum is installed
check_gum() {
    if ! command -v gum &> /dev/null; then
        print_error "gum is not installed. Please install it:"
        echo "  macOS: brew install gum"
        echo "  Linux: sudo apt install gum"
        echo "  Other: https://github.com/charmbracelet/gum#installation"
        exit 1
    fi
}

# Helper: Check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install it:"
        echo "  macOS: brew install jq"
        echo "  Linux: sudo apt install jq"
        exit 1
    fi
}

# Helper: Ask for input with gum
ask_input() {
    local prompt="$1"
    local placeholder="${2:-}"
    local password="${3:-false}"

    if [[ "$password" == "true" ]]; then
        gum input --prompt "$prompt " --placeholder "$placeholder" --password
    else
        gum input --prompt "$prompt " --placeholder "$placeholder"
    fi
}

# Helper: Ask for confirmation
ask_confirm() {
    local message="$1"
    gum confirm --affirmative "Yes" --negative "No" "$message"
}

# Helper: Choose from options
choose_option() {
    local prompt="$1"
    shift
    local options=("$@")
    printf '%s\n' "${options[@]}" | gum choose --header "$prompt"
}

# Get random student and boarding IDs from database
get_ids() {
    print_info "📦 Fetching random student and boarding from database..."
    echo ""

    # Get random student
    local student_query='SELECT id, "firstName", "lastName" FROM "User" WHERE role = '\''STUDENT'\'' ORDER BY RANDOM() LIMIT 1;'
    local student_result
    student_result=$(docker exec unistay_postgres psql -U postgres -d unistay_db -t -A -c "$student_query" 2>&1)

    if [[ $? -ne 0 ]] || [[ -z "$student_result" ]]; then
        print_error "Error fetching student: $student_result"
        return 1
    fi

    IFS='|' read -r student_id student_first student_last <<< "$student_result"

    if [[ -z "$student_id" ]]; then
        print_error "No students found in database!"
        return 1
    fi

    local student_name="$student_first $student_last"

    # Get random boarding
    local boarding_query='SELECT id, "propertyName" FROM "Boarding" ORDER BY RANDOM() LIMIT 1;'
    local boarding_result
    boarding_result=$(docker exec unistay_postgres psql -U postgres -d unistay_db -t -A -c "$boarding_query" 2>&1)

    if [[ $? -ne 0 ]] || [[ -z "$boarding_result" ]]; then
        print_error "Error fetching boarding: $boarding_result"
        return 1
    fi

    IFS='|' read -r boarding_id boarding_name <<< "$boarding_result"

    if [[ -z "$boarding_id" ]]; then
        print_error "No boardings found in database!"
        return 1
    fi

    # Update state
    update_state "student_id" "\"$student_id\""
    update_state "student_name" "\"$student_name\""
    update_state "boarding_id" "\"$boarding_id\""
    update_state "boarding_name" "\"$boarding_name\""

    # Display results with gum style
    gum style \
        --foreground 42 --border-foreground 42 --border rounded \
        --align left --width 60 --margin "1 2" --padding "1 2" \
        "✓ Selected" \
        "" \
        "$(gum style --foreground 212 "Student:") $student_name" \
        "$(gum style --foreground 241 "ID:") $student_id" \
        "" \
        "$(gum style --foreground 212 "Boarding:") $boarding_name" \
        "$(gum style --foreground 241 "ID:") $boarding_id"

    print_dim ""
    print_dim "IDs saved to state.json"
}

# Create a review
create_review() {
    local student_id boarding_id
    student_id=$(get_state "student_id")
    boarding_id=$(get_state "boarding_id")

    if [[ -z "$student_id" ]] || [[ "$student_id" == "null" ]]; then
        print_error "Please run --getids first to get student and boarding IDs"
        return 1
    fi

    print_info "📝 Creating a new review..."
    echo ""

    # Get rating with validation
    local rating
    rating=$(gum choose --header "Rating (out of 5):" "1 ⭐" "2 ⭐⭐" "3 ⭐⭐⭐" "4 ⭐⭐⭐⭐" "5 ⭐⭐⭐⭐⭐" | grep -o '^[0-9]')

    # Get comment
    local comment
    comment=$(gum write --placeholder "Enter your review comment..." --width 60 --height 5)

    # Get images (optional)
    print_warning ""
    print_warning "📷 Add images? (up to 5, press enter to skip)"
    local images=()
    local image_paths=""
    local add_image="y"
    local image_count=0

    while [[ "$add_image" == "y" ]] && [[ $image_count -lt 5 ]]; do
        local img_path
        img_path=$(gum input --prompt "Image $((image_count + 1)): " --placeholder "/path/to/image.jpg")

        if [[ -z "$img_path" ]]; then
            break
        fi

        if [[ -f "$img_path" ]]; then
            images+=("$img_path")
            ((image_count++))
        else
            print_warning "File not found, skipping..."
        fi
    done

    # Build image curl arguments
    local image_args=()
    for img in "${images[@]}"; do
        image_args+=("-F" "images=@$img")
    done

    # Get video (optional)
    print_warning ""
    local video_path
    video_path=$(gum input --prompt "🎬 Video path (optional): " --placeholder "/path/to/video.mp4")
    local video_args=()
    if [[ -n "$video_path" ]] && [[ -f "$video_path" ]]; then
        video_args=("-F" "video=@$video_path")
    fi

    # Create review
    print_dim ""
    print_dim "Creating review..."

    local response
    response=$(curl -s -X POST "$BASE_URL/reviews" \
        -H "x-user-id: $student_id" \
        -F "data={\"boardingId\":\"$boarding_id\",\"rating\":$rating,\"comment\":\"$comment\"}" \
        "${image_args[@]}" \
        "${video_args[@]}" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        local review_id comment_text like_count dislike_count
        review_id=$(echo "$json" | jq -r '.data.id')
        comment_text=$(echo "$json" | jq -r '.data.comment')
        like_count=$(echo "$json" | jq -r '.data.likeCount')
        dislike_count=$(echo "$json" | jq -r '.data.dislikeCount')

        # Update state
        update_state "review_id" "\"$review_id\""

        gum style \
            --foreground 42 --border-foreground 42 --border double \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Review created successfully!" \
            "" \
            "$(gum style --foreground 212 "Review ID:") $review_id" \
            "$(gum style --foreground 212 "Rating:") $rating ⭐" \
            "$(gum style --foreground 212 "Comment:") $comment_text" \
            "$(gum style --foreground 212 "Likes:") $like_count | $(gum style --foreground 212 "Dislikes:") $dislike_count"

        if [[ ${#images[@]} -gt 0 ]]; then
            echo ""
            print_dim "📷 Images: ${#images[@]} file(s) uploaded"
        fi

        if [[ -n "$video_path" ]] && [[ -f "$video_path" ]]; then
            print_dim "🎬 Video uploaded"
        fi

        print_dim ""
        print_dim "Review ID saved to state.json"
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "Unknown error"')
        print_error "Error: $error_msg"
    fi
}

# Read a review by ID
read_review() {
    local force="${1:-false}"
    local review_id
    review_id=$(get_state "review_id")

    if [[ "$force" == "true" ]] || [[ -z "$review_id" ]] || [[ "$review_id" == "null" ]]; then
        review_id=$(gum input --prompt "Review ID: " --placeholder "Enter review ID")
    fi

    if [[ -z "$review_id" ]]; then
        print_error "No review ID provided"
        return 1
    fi

    # Save review ID if entered manually
    update_state "review_id" "\"$review_id\""

    print_dim "Fetching review $review_id..."

    local response
    response=$(curl -s "$BASE_URL/reviews/$review_id" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        local boarding_name student_name rating comment likes dislikes created_at
        boarding_name=$(echo "$json" | jq -r '.data.boarding.propertyName')
        student_name=$(echo "$json" | jq -r '.data.student.firstName + " " + .data.student.lastName')
        rating=$(echo "$json" | jq -r '.data.rating')
        comment=$(echo "$json" | jq -r '.data.comment // "No comment"')
        likes=$(echo "$json" | jq -r '.data.likeCount')
        dislikes=$(echo "$json" | jq -r '.data.dislikeCount')
        created_at=$(echo "$json" | jq -r '.data.createdAt')

        gum style \
            --foreground 42 --border-foreground 42 --border rounded \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Review Found" \
            "" \
            "$(gum style --foreground 212 "ID:") $review_id" \
            "$(gum style --foreground 212 "Boarding:") $boarding_name" \
            "$(gum style --foreground 212 "Student:") $student_name" \
            "$(gum style --foreground 212 "Rating:") $rating ⭐" \
            "$(gum style --foreground 212 "Comment:") $comment" \
            "$(gum style --foreground 212 "Likes:") $likes | $(gum style --foreground 212 "Dislikes:") $dislikes" \
            "$(gum style --foreground 241 "Created:") $created_at"

        # Show images if any
        local image_count
        image_count=$(echo "$json" | jq '.data.images | length')
        if [[ "$image_count" -gt 0 ]]; then
            echo ""
            print_dim "📷 Images:"
            echo "$json" | jq -r '.data.images[]' | while read -r img; do
                print_dim "  - $img"
            done
        fi

        # Show video if any
        local video
        video=$(echo "$json" | jq -r '.data.video // empty')
        if [[ -n "$video" ]]; then
            print_dim "🎬 Video: $video"
        fi

        # Show comments if any
        local comment_count
        comment_count=$(echo "$json" | jq '.data.comments | length')
        if [[ "$comment_count" -gt 0 ]]; then
            echo ""
            print_dim "💬 Comments ($comment_count):"
            echo "$json" | jq -r '.data.comments[] | "  - \(.commentor.firstName): \(.comment)"'
        fi
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "Review not found"')
        print_error "Error: $error_msg"
    fi
}

# Read reviews by boarding
read_boarding_reviews() {
    local force="${1:-false}"
    local boarding_id
    boarding_id=$(get_state "boarding_id")

    if [[ "$force" == "true" ]] || [[ -z "$boarding_id" ]] || [[ "$boarding_id" == "null" ]]; then
        boarding_id=$(gum input --prompt "Boarding ID: " --placeholder "Enter boarding ID")
    fi

    if [[ -z "$boarding_id" ]]; then
        print_error "No boarding ID provided"
        return 1
    fi

    # Save boarding ID if entered manually
    update_state "boarding_id" "\"$boarding_id\""

    print_dim "Fetching reviews for boarding $boarding_id..."

    local response
    response=$(curl -s "$BASE_URL/reviews/boarding/$boarding_id" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        local page total total_pages
        page=$(echo "$json" | jq -r '.pagination.page')
        total=$(echo "$json" | jq -r '.pagination.total')
        total_pages=$(echo "$json" | jq -r '.pagination.totalPages')

        gum style \
            --foreground 42 --border-foreground 42 --border rounded \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Reviews Found" \
            "" \
            "$(gum style --foreground 212 "Page:") $page/$total_pages" \
            "$(gum style --foreground 212 "Total Reviews:") $total"

        echo ""
        print_dim "Reviews:"

        local review_count
        review_count=$(echo "$json" | jq '.data | length')

        for ((i=0; i<review_count; i++)); do
            local rid student rating comment likes
            rid=$(echo "$json" | jq -r ".data[$i].id")
            student=$(echo "$json" | jq -r ".data[$i].student.firstName + \" \" + .data[$i].student.lastName")
            rating=$(echo "$json" | jq -r ".data[$i].rating")
            comment=$(echo "$json" | jq -r ".data[$i].comment // \"No comment\"")
            likes=$(echo "$json" | jq -r ".data[$i].likeCount")

            gum style \
                --foreground 212 --border-foreground 212 --border normal \
                --align left --width 58 --margin "0 2" --padding "0 1" \
                "$(gum style --foreground 214 "Review:") $rid" \
                "$(gum style --foreground 212 "Student:") $student" \
                "$(gum style --foreground 212 "Rating:") $rating ⭐" \
                "$(gum style --foreground 241 "Comment:") $comment" \
                "$(gum style --foreground 241 "Likes:") $likes"
            echo ""
        done
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "No reviews found"')
        print_error "Error: $error_msg"
    fi
}

# Get review statistics
get_stats() {
    local force="${1:-false}"
    local boarding_id
    boarding_id=$(get_state "boarding_id")

    if [[ "$force" == "true" ]] || [[ -z "$boarding_id" ]] || [[ "$boarding_id" == "null" ]]; then
        boarding_id=$(gum input --prompt "Boarding ID: " --placeholder "Enter boarding ID")
    fi

    if [[ -z "$boarding_id" ]]; then
        print_error "No boarding ID provided"
        return 1
    fi

    # Save boarding ID if entered manually
    update_state "boarding_id" "\"$boarding_id\""

    print_dim "Fetching statistics for boarding $boarding_id..."

    local response
    response=$(curl -s "$BASE_URL/reviews/boarding/$boarding_id/stats" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        local total avg_rating
        total=$(echo "$json" | jq -r '.data.totalReviews')
        avg_rating=$(echo "$json" | jq -r '.data.averageRating')

        gum style \
            --foreground 42 --border-foreground 42 --border double \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Statistics Found" \
            "" \
            "$(gum style --foreground 212 "Total Reviews:") $total" \
            "$(gum style --foreground 214 "Average Rating:") $avg_rating ⭐" \
            "" \
            "$(gum style --foreground 241 "Rating Distribution:")"

        # Show rating distribution with bar chart
        for rating in 5 4 3 2 1; do
            local count
            count=$(echo "$json" | jq -r ".data.ratingDistribution[\"$rating\"] // 0")
            local bar=""
            for ((j=0; j<count; j++)); do
                bar+="█"
            done
            printf "  %s⭐: %s %s\n" "$rating" "$count" "$bar"
        done
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "Stats not found"')
        print_error "Error: $error_msg"
    fi
}

# Update a review
update_review() {
    local force="${1:-false}"
    local student_id review_id
    student_id=$(get_state "student_id")
    review_id=$(get_state "review_id")

    if [[ "$force" == "true" ]] || [[ -z "$review_id" ]] || [[ "$review_id" == "null" ]]; then
        review_id=$(gum input --prompt "Review ID: " --placeholder "Enter review ID")
    fi

    if [[ -z "$review_id" ]]; then
        print_error "No review ID provided"
        return 1
    fi

    # Save review ID if entered manually
    update_state "review_id" "\"$review_id\""

    print_warning "Enter new values (press enter to keep current)"
    echo ""

    # Get rating (optional)
    local rating_input
    rating_input=$(gum input --prompt "New rating (1-5): " --placeholder "Press enter to keep current")

    # Get comment (optional)
    local comment
    comment=$(gum write --placeholder "New comment (press enter to keep current)" --width 60 --height 5)

    # Build update JSON
    local update_json="{"
    local has_updates=false

    if [[ -n "$rating_input" ]] && [[ "$rating_input" =~ ^[1-5]$ ]]; then
        update_json+="\"rating\":$rating_input"
        has_updates=true
    fi

    if [[ -n "$comment" ]]; then
        if [[ "$has_updates" == "true" ]]; then
            update_json+=","
        fi
        update_json+="\"comment\":\"$comment\""
        has_updates=true
    fi

    update_json+="}"

    if [[ "$has_updates" == "false" ]]; then
        print_warning "No changes provided"
        return 1
    fi

    print_dim "Updating review..."

    local response
    response=$(curl -s -X PUT "$BASE_URL/reviews/$review_id" \
        -H "x-user-id: $student_id" \
        -F "data=$update_json" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        local edited_at
        edited_at=$(echo "$json" | jq -r '.data.editedAt // "N/A"')

        gum style \
            --foreground 42 --border-foreground 42 --border rounded \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Review updated successfully!" \
            "" \
            "$(gum style --foreground 212 "ID:") $review_id" \
            "$(gum style --foreground 241 "Edited at:") $edited_at" \
            "" \
            "$(gum style --foreground 214 "⚠️  This review can no longer be edited")"
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "Update failed"')
        print_error "Error: $error_msg"
    fi
}

# Delete a review
delete_review() {
    local force="${1:-false}"
    local student_id review_id
    student_id=$(get_state "student_id")
    review_id=$(get_state "review_id")

    if [[ "$force" == "true" ]] || [[ -z "$review_id" ]] || [[ "$review_id" == "null" ]]; then
        review_id=$(gum input --prompt "Review ID: " --placeholder "Enter review ID")
    fi

    if [[ -z "$review_id" ]]; then
        print_error "No review ID provided"
        return 1
    fi

    # Confirm deletion
    if [[ "$force" != "true" ]]; then
        if ! gum confirm --affirmative "Yes, delete" --negative "Cancel" "Delete review $review_id?"; then
            print_dim "Cancelled"
            return 1
        fi
    fi

    print_dim "Deleting review..."

    local response
    response=$(curl -s -X DELETE "$BASE_URL/reviews/$review_id" \
        -H "x-user-id: $student_id" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        update_state "review_id" "null"

        gum style \
            --foreground 42 --border-foreground 42 --border rounded \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Review deleted successfully!" \
            "" \
            "$(gum style --foreground 241 "Review ID removed from state.json")"
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "Delete failed"')
        print_error "Error: $error_msg"
    fi
}

# Like/Dislike a review
react_to_review() {
    local reaction_type="$1"
    local force="${2:-false}"
    local student_id review_id
    student_id=$(get_state "student_id")
    review_id=$(get_state "review_id")

    if [[ "$force" == "true" ]] || [[ -z "$review_id" ]] || [[ "$review_id" == "null" ]]; then
        review_id=$(gum input --prompt "Review ID: " --placeholder "Enter review ID")
    fi

    if [[ -z "$review_id" ]]; then
        print_error "No review ID provided"
        return 1
    fi

    # Save review ID if entered manually
    update_state "review_id" "\"$review_id\""

    local emoji action_text
    if [[ "$reaction_type" == "LIKE" ]]; then
        emoji="👍"
        action_text="Liking"
    else
        emoji="👎"
        action_text="Disliking"
    fi

    print_dim "$action_text review..."

    local response
    response=$(curl -s -X POST "$BASE_URL/reviews/$review_id/reactions" \
        -H "x-user-id: $student_id" \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"$reaction_type\"}" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        local action
        action=$(echo "$json" | jq -r '.data.action')

        gum style \
            --foreground 42 --border-foreground 42 --border rounded \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Review ${reaction_type,,}d ($action) $emoji"
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "Reaction failed"')
        print_error "Error: $error_msg"
    fi
}

# Add comment to a review
add_comment() {
    local force="${1:-false}"
    local student_id review_id
    student_id=$(get_state "student_id")
    review_id=$(get_state "review_id")

    if [[ "$force" == "true" ]] || [[ -z "$review_id" ]] || [[ "$review_id" == "null" ]]; then
        review_id=$(gum input --prompt "Review ID: " --placeholder "Enter review ID")
    fi

    if [[ -z "$review_id" ]]; then
        print_error "No review ID provided"
        return 1
    fi

    # Save review ID if entered manually
    update_state "review_id" "\"$review_id\""

    # Use student ID as commentor ID
    local commentor_id="${student_id:-null}"
    if [[ "$commentor_id" == "null" ]] || [[ -z "$commentor_id" ]]; then
        commentor_id=$(gum input --prompt "Your user ID: " --placeholder "Enter user ID")
    fi

    print_info "💬 Add a comment"
    echo ""
    local comment_text
    comment_text=$(gum write --placeholder "Enter your comment..." --width 60 --height 5)

    print_dim "Adding comment..."

    local response
    response=$(curl -s -X POST "$BASE_URL/reviews/$review_id/comments" \
        -H "x-user-id: $commentor_id" \
        -H "Content-Type: application/json" \
        -d "{\"comment\":\"$comment_text\"}" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        local comment_id created_at
        comment_id=$(echo "$json" | jq -r '.data.id')
        created_at=$(echo "$json" | jq -r '.data.commentedAt')

        # Update state - add comment ID to array
        local current_comments
        current_comments=$(get_state "comment_ids")
        if [[ -z "$current_comments" ]] || [[ "$current_comments" == "null" ]]; then
            update_state "comment_ids" "[\"$comment_id\"]"
        else
            update_state "comment_ids" "$(echo "$current_comments" | jq ". + [\"$comment_id\"]")"
        fi

        gum style \
            --foreground 42 --border-foreground 42 --border rounded \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Comment added successfully!" \
            "" \
            "$(gum style --foreground 212 "Comment ID:") $comment_id" \
            "$(gum style --foreground 212 "Comment:") $comment_text" \
            "$(gum style --foreground 241 "Created:") $created_at" \
            "" \
            "$(gum style --foreground 241 "Comment ID saved to state.json")"
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "Comment failed"')
        print_error "Error: $error_msg"
    fi
}

# Update a comment
update_comment() {
    local force="${1:-false}"
    local student_id comment_id
    student_id=$(get_state "student_id")

    # Get comment IDs from state
    local comment_ids_json
    comment_ids_json=$(get_state "comment_ids")

    if [[ "$force" != "true" ]] && [[ -n "$comment_ids_json" ]] && [[ "$comment_ids_json" != "null" ]] && [[ "$comment_ids_json" != "[]" ]]; then
        # Show selector
        local comment_count
        comment_count=$(echo "$comment_ids_json" | jq 'length')

        print_dim "Available comments:"
        local options=()
        for ((i=0; i<comment_count; i++)); do
            local cid
            cid=$(echo "$comment_ids_json" | jq -r ".[$i]")
            options+=("$i: $cid")
        done

        local choice
        choice=$(printf '%s\n' "${options[@]}" | gum choose --header "Select a comment to update")
        local idx
        idx=$(echo "$choice" | cut -d':' -f1)
        comment_id=$(echo "$comment_ids_json" | jq -r ".[$idx]")
    else
        comment_id=$(gum input --prompt "Comment ID: " --placeholder "Enter comment ID")
    fi

    if [[ -z "$comment_id" ]]; then
        print_error "No comment ID provided"
        return 1
    fi

    local new_comment
    new_comment=$(gum write --placeholder "Updated comment..." --width 60 --height 5)

    print_dim "Updating comment..."

    local response
    response=$(curl -s -X PUT "$BASE_URL/reviews/comments/$comment_id" \
        -H "x-user-id: $student_id" \
        -H "Content-Type: application/json" \
        -d "{\"comment\":\"$new_comment\"}" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        local edited_at
        edited_at=$(echo "$json" | jq -r '.data.editedAt // "N/A"')

        gum style \
            --foreground 42 --border-foreground 42 --border rounded \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Comment updated successfully!" \
            "" \
            "$(gum style --foreground 212 "ID:") $comment_id" \
            "$(gum style --foreground 212 "Comment:") $new_comment" \
            "$(gum style --foreground 241 "Edited at:") $edited_at" \
            "" \
            "$(gum style --foreground 214 "⚠️  This comment can no longer be edited")"
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "Update failed"')
        print_error "Error: $error_msg"
    fi
}

# Delete a comment
delete_comment() {
    local force="${1:-false}"
    local student_id comment_id
    student_id=$(get_state "student_id")

    # Get comment IDs from state
    local comment_ids_json
    comment_ids_json=$(get_state "comment_ids")

    if [[ "$force" != "true" ]] && [[ -n "$comment_ids_json" ]] && [[ "$comment_ids_json" != "null" ]] && [[ "$comment_ids_json" != "[]" ]]; then
        # Show selector
        local comment_count
        comment_count=$(echo "$comment_ids_json" | jq 'length')

        print_dim "Available comments:"
        local options=()
        for ((i=0; i<comment_count; i++)); do
            local cid
            cid=$(echo "$comment_ids_json" | jq -r ".[$i]")
            options+=("$i: $cid")
        done

        local choice
        choice=$(printf '%s\n' "${options[@]}" | gum choose --header "Select a comment to delete")
        local idx
        idx=$(echo "$choice" | cut -d':' -f1)
        comment_id=$(echo "$comment_ids_json" | jq -r ".[$idx]")
    else
        comment_id=$(gum input --prompt "Comment ID: " --placeholder "Enter comment ID")
    fi

    if [[ -z "$comment_id" ]]; then
        print_error "No comment ID provided"
        return 1
    fi

    # Confirm deletion
    if [[ "$force" != "true" ]]; then
        if ! gum confirm --affirmative "Yes, delete" --negative "Cancel" "Delete comment $comment_id?"; then
            print_dim "Cancelled"
            return 1
        fi
    fi

    print_dim "Deleting comment..."

    local response
    response=$(curl -s -X DELETE "$BASE_URL/reviews/comments/$comment_id" \
        -H "x-user-id: $student_id" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        # Remove comment ID from state
        local new_comments
        new_comments=$(echo "$comment_ids_json" | jq --arg id "$comment_id" 'map(select(. != $id))')
        update_state "comment_ids" "$new_comments"

        gum style \
            --foreground 42 --border-foreground 42 --border rounded \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Comment deleted successfully!" \
            "" \
            "$(gum style --foreground 241 "Comment ID removed from state.json")"
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "Delete failed"')
        print_error "Error: $error_msg"
    fi
}

# Like/Dislike a comment
react_to_comment() {
    local reaction_type="$1"
    local force="${2:-false}"
    local student_id comment_id
    student_id=$(get_state "student_id")

    # Get comment IDs from state
    local comment_ids_json
    comment_ids_json=$(get_state "comment_ids")

    if [[ "$force" != "true" ]] && [[ -n "$comment_ids_json" ]] && [[ "$comment_ids_json" != "null" ]] && [[ "$comment_ids_json" != "[]" ]]; then
        # Show selector
        local comment_count
        comment_count=$(echo "$comment_ids_json" | jq 'length')

        print_dim "Available comments:"
        local options=()
        for ((i=0; i<comment_count; i++)); do
            local cid
            cid=$(echo "$comment_ids_json" | jq -r ".[$i]")
            options+=("$i: $cid")
        done

        local choice
        choice=$(printf '%s\n' "${options[@]}" | gum choose --header "Select a comment to $reaction_type")
        local idx
        idx=$(echo "$choice" | cut -d':' -f1)
        comment_id=$(echo "$comment_ids_json" | jq -r ".[$idx]")
    else
        comment_id=$(gum input --prompt "Comment ID: " --placeholder "Enter comment ID")
    fi

    if [[ -z "$comment_id" ]]; then
        print_error "No comment ID provided"
        return 1
    fi

    local emoji
    if [[ "$reaction_type" == "LIKE" ]]; then
        emoji="👍"
    else
        emoji="👎"
    fi

    print_dim "${reaction_type}ing comment..."

    local response
    response=$(curl -s -X POST "$BASE_URL/reviews/comments/$comment_id/reactions" \
        -H "x-user-id: $student_id" \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"$reaction_type\"}" 2>&1)

    local json
    json=$(echo "$response" | jq .)
    local success
    success=$(echo "$json" | jq -r '.success')

    if [[ "$success" == "true" ]]; then
        local action
        action=$(echo "$json" | jq -r '.data.action')

        gum style \
            --foreground 42 --border-foreground 42 --border rounded \
            --align left --width 60 --margin "1 2" --padding "1 2" \
            "✓ Comment ${reaction_type,,}d ($action) $emoji"
    else
        local error_msg
        error_msg=$(echo "$json" | jq -r '.message // "Reaction failed"')
        print_error "Error: $error_msg"
    fi
}

# Show help
show_help() {
    gum style \
        --foreground 42 --border-foreground 42 --border double \
        --align center --width 70 --margin "1 2" --padding "1 2" \
        "UniStay Review API Demo Script" \
        "" \
        "$(gum style --foreground 212 "A glamorous shell script to test the Review API")"

    cat << 'EOF'

Usage: ./review_api_demo.sh <command> [--force]

Commands:
  --getids     Get random student and boarding IDs from database
  --create     Create a new review (requires --getids first)
  --read       Read a review by ID (from state or prompt)
  --readb      Read all reviews for a boarding (from state or prompt)
  --stat       Show review statistics for a boarding
  --update     Update a review (one-time edit only)
  --delete     Delete a review
  --like       Like a review
  --dislike    Dislike a review
  --comment    Add a comment to a review
  --updatec    Update a comment (one-time edit only)
  --deletec    Delete a comment
  --likec      Like a comment
  --dislikec   Dislike a comment
  --help       Show this help message

Options:
  --force      Force prompt for ID even if stored in state

State Management:
  State is stored in state.json in the current directory.
  This includes: student_id, boarding_id, review_id, comment_ids

Examples:
  ./review_api_demo.sh --getids
  ./review_api_demo.sh --create
  ./review_api_demo.sh --read
  ./review_api_demo.sh --read --force
  ./review_api_demo.sh --like
  ./review_api_demo.sh --comment
  ./review_api_demo.sh --deletec

EOF
}

# Main entry point
main() {
    # Check dependencies
    check_gum
    check_jq

    # Initialize state
    init_state

    # Parse arguments
    local force=false

    case "${1:-}" in
        --getids)
            get_ids
            ;;
        --create)
            create_review
            ;;
        --read)
            [[ "${2:-}" == "--force" ]] && force=true
            read_review "$force"
            ;;
        --readb)
            [[ "${2:-}" == "--force" ]] && force=true
            read_boarding_reviews "$force"
            ;;
        --stat)
            [[ "${2:-}" == "--force" ]] && force=true
            get_stats "$force"
            ;;
        --update)
            [[ "${2:-}" == "--force" ]] && force=true
            update_review "$force"
            ;;
        --delete)
            [[ "${2:-}" == "--force" ]] && force=true
            delete_review "$force"
            ;;
        --like)
            [[ "${2:-}" == "--force" ]] && force=true
            react_to_review "LIKE" "$force"
            ;;
        --dislike)
            [[ "${2:-}" == "--force" ]] && force=true
            react_to_review "DISLIKE" "$force"
            ;;
        --comment)
            [[ "${2:-}" == "--force" ]] && force=true
            add_comment "$force"
            ;;
        --updatec)
            [[ "${2:-}" == "--force" ]] && force=true
            update_comment "$force"
            ;;
        --deletec)
            [[ "${2:-}" == "--force" ]] && force=true
            delete_comment "$force"
            ;;
        --likec)
            [[ "${2:-}" == "--force" ]] && force=true
            react_to_comment "LIKE" "$force"
            ;;
        --dislikec)
            [[ "${2:-}" == "--force" ]] && force=true
            react_to_comment "DISLIKE" "$force"
            ;;
        --help|-h|"")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Run './review_api_demo.sh --help' for usage"
            exit 1
            ;;
    esac
}

main "$@"
