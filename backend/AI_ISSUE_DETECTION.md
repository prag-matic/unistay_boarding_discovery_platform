# AI-Powered Chat Issue Detection

This feature uses AI (via OpenRouter's `minimax/minimax-m2.5:free` model) to automatically analyze chat messages in real-time and detect potential issues that should be tracked formally.

## Overview

When users send messages in chat rooms, the system:
1. Analyzes each text message using AI
2. Detects concerns, complaints, or problems (e.g., "the bulb is not working", "you didn't pay the rent")
3. Emits a real-time Socket.io event with the analysis result
4. Allows users to convert the detected issue into a formal tracked issue with a single click

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# OpenRouter (AI model access)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=minimax/minimax-m2.5:free
```

Get your API key from [OpenRouter](https://openrouter.ai/).

## How It Works

### Real-time Message Analysis

When a message is sent via Socket.io:

1. The message is saved to the database
2. The `chatAnalysisService` analyzes the message content
3. If a potential issue is detected, an `issueAnalysis` event is emitted to all participants in the chat room

### Socket.io Events

#### Client receives `issueAnalysis` event:

```typescript
socket.on("issueAnalysis", (data) => {
  // data structure:
  // {
  //   messageId: string;
  //   roomId: string;
  //   isIssue: boolean;
  //   reason: string;
  //   category?: string;
  //   suggestedPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  // }
  
  if (data.isIssue) {
    // Show UI prompt: "Convert this message to an issue?"
    // Display the reason and suggested priority
  }
});
```

### Frontend Integration Example

```typescript
// Connect to socket and listen for issue analysis
socket.on("issueAnalysis", (data) => {
  if (data.isIssue) {
    // Show a notification or modal
    showIssueDetectionPrompt({
      messageId: data.messageId,
      roomId: data.roomId,
      reason: data.reason,
      category: data.category,
      suggestedPriority: data.suggestedPriority,
    });
  }
});

// When user clicks "Convert to Issue" button
async function convertToIssue(messageId: string, roomId: string) {
  const response = await fetch("/api/issues", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messageId,
      roomId,
      // Optional: override AI-suggested values
      // priority: "HIGH",
      // category: "maintenance",
      // title: "Custom title",
      // description: "Custom description",
    }),
  });
  
  const result = await response.json();
  // Handle success/error
}
```

## API Endpoints

### Create Issue from Chat Message

**POST** `/api/issues`

Convert a chat message into a formal issue.

**Request Body:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "messageId": "507f1f77bcf86cd799439012",
  "reason": "AI-detected reason or custom reason",
  "title": "Optional custom title",
  "description": "Optional custom description",
  "priority": "MEDIUM",
  "category": "maintenance"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "roomId": "...",
    "reportedBy": {...},
    "title": "Bulb not working",
    "description": "The bulb in room 3 is not working",
    "reason": "Message indicates a maintenance problem",
    "status": "OPEN",
    "priority": "MEDIUM",
    "category": "maintenance",
    "messageContext": [...],
    "createdAt": "2025-03-25T10:00:00.000Z"
  }
}
```

### Analyze Message (Without Creating Issue)

**POST** `/api/issues/analyze`

Analyze a message to check if it contains an issue (manual trigger).

**Request Body:**
```json
{
  "roomId": "507f1f77bcf86cd799439011",
  "messageId": "507f1f77bcf86cd799439012"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "507f1f77bcf86cd799439012",
    "roomId": "507f1f77bcf86cd799439011",
    "analysis": {
      "isIssue": true,
      "reason": "Message indicates a maintenance problem",
      "category": "maintenance",
      "suggestedPriority": "MEDIUM"
    }
  }
}
```

### Get All Issues

**GET** `/api/issues?status=OPEN&priority=HIGH&cursor=...&limit=20`

Get all issues for the authenticated user (filtered by role).

**Query Parameters:**
- `status` - Filter by status: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- `priority` - Filter by priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `roomId` - Filter by chat room ID
- `cursor` - Pagination cursor
- `limit` - Number of results (default: 20, max: 100)

### Get Single Issue

**GET** `/api/issues/:id`

Get details of a specific issue.

### Update Issue

**PUT** `/api/issues/:id`

Update issue status, priority, assignment, or resolution notes.

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "assignedTo": "507f1f77bcf86cd799439014",
  "resolutionNotes": "Optional notes when resolving"
}
```

### Delete Issue

**DELETE** `/api/issues/:id`

Delete an issue (only admins or the reporter can delete).

## Issue Detection Categories

The AI model looks for messages indicating:

- **Maintenance**: Broken fixtures, repairs needed, malfunctioning equipment
- **Payment**: Rent issues, payment disputes, billing problems
- **Rules**: Rule violations, noise complaints, visitor policy issues
- **Safety**: Security concerns, hazards, emergencies
- **Service**: Complaints about services, cleanliness, amenities

## Issue Statuses

- `OPEN` - Newly created issue
- `IN_PROGRESS` - Being worked on
- `RESOLVED` - Issue has been resolved
- `CLOSED` - Issue closed (may be reopened)

## Issue Priorities

- `LOW` - Minor issue, no urgency
- `MEDIUM` - Normal priority (default)
- `HIGH` - Important issue, needs attention
- `URGENT` - Critical issue, immediate action required

## Architecture

```
┌─────────────┐
│   User A    │
│  (Student)  │
└──────┬──────┘
       │
       │ sendMessage (Socket.io)
       ▼
┌─────────────────────────────────────┐
│         Socket.io Server            │
│  ┌───────────────────────────────┐  │
│  │  sendMessage handler          │  │
│  │  1. Save message to DB        │  │
│  │  2. Emit 'message' event      │  │
│  │  3. Call chatAnalysisService  │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │
               │ analyzeMessage()
               ▼
┌─────────────────────────────────────┐
│     chatAnalysis.service.ts         │
│  ┌───────────────────────────────┐  │
│  │  OpenRouter API Call          │  │
│  │  Model: minimax-m2.5:free     │  │
│  │  Stream response              │  │
│  │  Parse JSON result            │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │
               │ { isIssue, reason, category, priority }
               ▼
┌─────────────────────────────────────┐
│         Socket.io Server            │
│  Emit 'issueAnalysis' event         │
└──────────────┬──────────────────────┘
               │
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐ ┌─────────────┐
│   User A    │ │   User B    │
│  (Student)  │ │   (Owner)   │
└─────────────┘ └─────────────┘
    (Both receive the analysis)
```

## Error Handling

- If OpenRouter API is not configured, analysis is skipped silently
- If AI analysis fails, the message is still sent normally
- Analysis errors are logged but don't block the chat flow
- Frontend should handle cases where issue creation fails

## Rate Limiting

Consider implementing rate limiting for the `/api/issues/analyze` endpoint to prevent abuse.

## Testing

To test the feature:

1. Set up your `OPENROUTER_API_KEY` in `.env`
2. Start the backend server
3. Open a chat room between a student and owner
4. Send a message like "The light bulb in my room is broken"
5. The frontend should receive an `issueAnalysis` event
6. Click the "Convert to Issue" button to create a formal issue

## Future Enhancements

- Batch analysis of recent messages (not just real-time)
- Custom AI prompts per boarding house
- Auto-assign issues based on category
- Email notifications for new issues
- Issue templates for common problems
- Multi-language support
