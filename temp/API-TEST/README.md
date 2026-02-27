# UniStay Review API Demo Script

A glamorous shell script to demonstrate and test the UniStay Review API endpoints with automatic state management. Built with **gum** for beautiful UI, **jq** for JSON parsing, and **curl** for API calls.

![Demo](https://stuff.charm.sh/gum/gum.png)

## Prerequisites

### Required Tools

1. **gum** - For glamorous shell UI
2. **jq** - For JSON parsing
3. **curl** - For HTTP requests
4. **docker** - For database access

### Installation

#### Install gum

```bash
# macOS
brew install gum

# Linux (Debian/Ubuntu)
sudo apt install gum

# Arch Linux
pacman -S gum

# Other platforms
# See: https://github.com/charmbracelet/gum#installation
```

#### Install jq

```bash
# macOS
brew install jq

# Linux (Debian/Ubuntu)
sudo apt install jq

# Fedora
sudo dnf install jq
```

#### Install curl

```bash
# Usually pre-installed on most systems
# macOS (if needed)
brew install curl

# Linux
sudo apt install curl
```

### Backend Requirements

1. **Docker** - PostgreSQL container must be running (`unistay_postgres`)
2. **Backend Server** - API server running on `http://localhost:3000`
3. **Database Seeded** - Run the seeder to populate test data

```bash
# Check if PostgreSQL container is running
docker ps | grep unistay_postgres

# Start backend server
cd ../../backend
npm run dev

# Seed database (if needed)
npx prisma db seed
```

## Quick Start

```bash
# Navigate to the API-TEST directory
cd temp/API-TEST

# Make the script executable
chmod +x review_api_demo.sh

# View help
./review_api_demo.sh --help
```

## Usage Flow

### 1. Get Test IDs

First, fetch random student and boarding IDs from the database:

```bash
./review_api_demo.sh --getids
```

**Output:**
```
╭────────────────────────────────────────╮
│ ✓ Selected                             │
│                                        │
│ Student: John Doe                      │
│ ID: cmm2etffe0000vezeo13gz82n          │
│                                        │
│ Boarding: Sunshine Apartments          │
│ ID: cmm2etfgy000qvezejq711xyf          │
╰────────────────────────────────────────╯
```

This stores the IDs in `state.json` for subsequent commands.

### 2. Create a Review

Create a new review with rating, comment, and optional media:

```bash
./review_api_demo.sh --create
```

**Interactive prompts:**
- Choose rating (1-5 stars) using gum choose
- Enter review comment using gum write
- Add image paths (up to 5, optional)
- Add video path (optional)

**Output:**
```
╭────────────────────────────────────────╮
│ ✓ Review created successfully!         │
│                                        │
│ Review ID: cmm2xyz123...               │
│ Rating: 5 ⭐                            │
│ Comment: Amazing boarding experience!  │
│ Likes: 0 | Dislikes: 0                 │
╰────────────────────────────────────────╯
```

### 3. Read Reviews

**Read a specific review:**
```bash
# Uses review ID from state.json
./review_api_demo.sh --read

# Force prompt for different ID
./review_api_demo.sh --read --force
```

**Read all reviews for a boarding:**
```bash
# Uses boarding ID from state.json
./review_api_demo.sh --readb

# Force prompt for different boarding
./review_api_demo.sh --readb --force
```

### 4. View Statistics

Get review statistics for the boarding:

```bash
./review_api_demo.sh --stat
```

**Output:**
```
╭────────────────────────────────────────╮
│ ✓ Statistics Found                     │
│                                        │
│ Total Reviews: 33                      │
│ Average Rating: 4.2 ⭐                   │
│                                        │
│ Rating Distribution:                   │
│   5⭐: 15 ███████████████               │
│   4⭐: 10 ██████████                    │
│   3⭐: 5 █████                          │
│   2⭐: 2 ██                             │
│   1⭐: 1 █                              │
╰────────────────────────────────────────╯
```

### 5. Update a Review

**Note:** Reviews can only be edited once (one-time edit policy).

```bash
./review_api_demo.sh --update
```

**Prompts:**
- New rating (press enter to keep current)
- New comment (press enter to keep current)

### 6. Delete a Review

```bash
./review_api_demo.sh --delete
```

Confirms before deletion (unless `--force` is used).

### 7. React to Reviews

**Like a review:**
```bash
./review_api_demo.sh --like
```

**Dislike a review:**
```bash
./review_api_demo.sh --dislike
```

**Note:** Sending the same reaction twice toggles it off.

### 8. Comment on Reviews

**Add a comment:**
```bash
./review_api_demo.sh --comment
```

**Output:**
```
╭────────────────────────────────────────╮
│ ✓ Comment added successfully!          │
│                                        │
│ Comment ID: cmm2abc456...              │
│ Comment: Thank you for your feedback!  │
│ Created: 2026-02-26T09:00:00.000Z      │
╰────────────────────────────────────────╯
```

### 9. Manage Comments

**Update a comment:**
```bash
./review_api_demo.sh --updatec
```

Shows a selector if comments exist in state:
```
Available comments:
  0: cmm2abc456...
  1: cmm2def789...
```

**Delete a comment:**
```bash
./review_api_demo.sh --deletec
```

**Like/Dislike a comment:**
```bash
./review_api_demo.sh --likec
./review_api_demo.sh --dislikec
```

## Command Reference

| Command | Description | Uses State | Force Option |
|---------|-------------|------------|--------------|
| `--getids` | Get random student & boarding IDs | ✅ Write | ❌ |
| `--create` | Create a new review | ✅ Read | ❌ |
| `--read` | Read review by ID | ✅ Read | ✅ |
| `--readb` | Read all reviews for boarding | ✅ Read | ✅ |
| `--stat` | Get boarding review statistics | ✅ Read | ✅ |
| `--update` | Update a review (one-time) | ✅ Read | ✅ |
| `--delete` | Delete a review | ✅ Read/Write | ✅ |
| `--like` | Like a review | ✅ Read | ✅ |
| `--dislike` | Dislike a review | ✅ Read | ✅ |
| `--comment` | Add comment to review | ✅ Read | ✅ |
| `--updatec` | Update a comment (one-time) | ✅ Read/Write | ✅ |
| `--deletec` | Delete a comment | ✅ Read/Write | ✅ |
| `--likec` | Like a comment | ✅ Read/Write | ✅ |
| `--dislikec` | Dislike a comment | ✅ Read/Write | ✅ |
| `--help` | Show help message | ❌ | ❌ |

## State Management

The script maintains state in `state.json`:

```json
{
  "student_id": "cmm2etffe0000vezeo13gz82n",
  "student_name": "John Doe",
  "boarding_id": "cmm2etfgy000qvezejq711xyf",
  "boarding_name": "Sunshine Apartments",
  "review_id": "cmm2xyz123...",
  "comment_ids": [
    "cmm2abc456...",
    "cmm2def789..."
  ]
}
```

### State Behavior

- **Automatic Storage:** IDs are automatically saved after successful operations
- **Automatic Retrieval:** Commands use stored IDs by default
- **Force Override:** Use `--force` to manually enter IDs even if stored
- **Cleanup:** Deleted items are automatically removed from state
- **Comment Selector:** When multiple comments exist, shows interactive selector

## Examples

### Complete Testing Workflow

```bash
# 1. Get test data
./review_api_demo.sh --getids

# 2. Create a review
./review_api_demo.sh --create

# 3. View the review
./review_api_demo.sh --read

# 4. Like the review
./review_api_demo.sh --like

# 5. Add a comment
./review_api_demo.sh --comment

# 6. View boarding statistics
./review_api_demo.sh --stat

# 7. Like the comment
./review_api_demo.sh --likec

# 8. Update the review (one-time only)
./review_api_demo.sh --update

# 9. Clean up - delete review (also removes from state)
./review_api_demo.sh --delete
```

### Working with Multiple Items

```bash
# Get IDs for first boarding
./review_api_demo.sh --getids
./review_api_demo.sh --create

# Work with different boarding (force new ID)
./review_api_demo.sh --readb --force

# Work with different review
./review_api_demo.sh --read --force
```

## Troubleshooting

### gum Not Found

```
gum is not installed. Please install it:
```

**Solution:** Install gum from [https://github.com/charmbracelet/gum#installation](https://github.com/charmbracelet/gum#installation)

### jq Not Found

```
jq is not installed. Please install it:
```

**Solution:** Install jq with your package manager

### Docker Connection Error

```
Error: Cannot connect to the Docker daemon
```

**Solution:** Ensure Docker is running and the PostgreSQL container is up:
```bash
docker ps | grep unistay_postgres
```

### Database Empty

```
No students found in database!
```

**Solution:** Run the database seeder:
```bash
cd ../../backend
npx prisma db seed
```

### Backend Not Running

```
curl: (7) Failed to connect to localhost port 3000
```

**Solution:** Start the backend server:
```bash
cd ../../backend
npm run dev
```

## API Endpoints Reference

For detailed API documentation, see [REVIEW_API.md](../../backend/REVIEW_API.md)

### Base URLs

| Resource | Endpoint |
|----------|----------|
| Reviews | `POST/GET /api/reviews` |
| Review by ID | `GET /api/reviews/:id` |
| Boarding Reviews | `GET /api/reviews/boarding/:boardingId` |
| Statistics | `GET /api/reviews/boarding/:boardingId/stats` |
| Reactions | `POST /api/reviews/:id/reactions` |
| Comments | `POST /api/reviews/:id/comments` |
| Comment Reactions | `POST /api/reviews/comments/:id/reactions` |

## Features

✨ **Glamorous UI** - Beautiful terminal interfaces powered by gum  
📦 **State Management** - Automatic ID tracking in state.json  
🎯 **Interactive Selectors** - Choose from lists with gum choose  
✏️ **Rich Input** - Multi-line text input with gum write  
📊 **Visual Statistics** - Bar chart visualization for ratings  
🔄 **Toggle Reactions** - Like/dislike with toggle behavior  
💬 **Comment Management** - Full CRUD for review comments  
⚠️ **One-time Edits** - Enforces single-edit policy  

## Tips

1. **Always start with `--getids`** to populate state with valid test data
2. **Use `--force`** when working with multiple reviews/boardings
3. **Check `state.json`** to see current stored IDs
4. **One-time edits** - Reviews and comments can only be edited once
5. **Toggle reactions** - Sending the same reaction twice removes it

## File Structure

```
temp/API-TEST/
├── review_api_demo.sh    # Main demo script
├── state.json            # Auto-generated state file
└── README.md            # This documentation
```

## Credits

- [gum](https://github.com/charmbracelet/gum) - Glamorous shell scripts
- [jq](https://github.com/jqlang/jq) - JSON processor
- [curl](https://curl.se/) - Command line tool for transferring data

---

Part of the **UniStay Boarding Discovery Platform**
