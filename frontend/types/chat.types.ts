export interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  role: 'STUDENT' | 'OWNER' | 'ADMIN';
}

export interface ChatBoarding {
  id: string;
  propertyName: string;
  address: string;
  city: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  sender?: ChatUser;
  content: string;
  messageType: 'text' | 'image' | 'file';
  createdAt: string;
  isRead?: boolean;
  readAt?: string;
}

export interface ChatRoom {
  id: string;
  participants: {
    student: ChatUser;
    owner: ChatUser;
  };
  boardingId?: ChatBoarding;
  lastMessage?: {
    id: string;
    content: string;
    messageType: string;
    createdAt: string;
  };
  lastMessageAt?: string;
  isActive: boolean;
}

export interface IssueAnalysis {
  messageId: string;
  roomId: string;
  isIssue: boolean;
  reason: string;
  category?: 'maintenance' | 'payment' | 'rule_violation' | 'safety' | 'other';
  suggestedPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface Issue {
  id: string;
  roomId: string;
  boardingId?: string;
  reportedBy: ChatUser;
  assignedTo?: ChatUser;
  title: string;
  description: string;
  reason: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  messageContext?: Array<{
    messageId: string;
    content: string;
    senderId: string;
    createdAt: string;
  }>;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: ChatUser;
  createdAt: string;
  updatedAt: string;
}

export type ChatBackgroundType = 'default' | 'issue_maintenance' | 'issue_payment' | 'issue_rule_violation' | 'issue_safety' | 'issue_other';

export const ISSUE_BACKGROUND_COLORS: Record<ChatBackgroundType, string> = {
  default: '#FFFFFF',
  issue_maintenance: '#FFF3E0', // Light orange
  issue_payment: '#FFEBEE', // Light red
  issue_rule_violation: '#FFFDE7', // Light yellow
  issue_safety: '#FCE4EC', // Light pink
  issue_other: '#E3F2FD', // Light blue
};

export const ISSUE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  maintenance: { bg: '#FF9800', text: '#FFFFFF' },
  payment: { bg: '#F44336', text: '#FFFFFF' },
  rule_violation: { bg: '#FFC107', text: '#000000' },
  safety: { bg: '#E91E63', text: '#FFFFFF' },
  other: { bg: '#2196F3', text: '#FFFFFF' },
};

export const ISSUE_PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  LOW: { bg: '#4CAF50', text: '#FFFFFF' },
  MEDIUM: { bg: '#FF9800', text: '#FFFFFF' },
  HIGH: { bg: '#F44336', text: '#FFFFFF' },
  URGENT: { bg: '#9C27B0', text: '#FFFFFF' },
};
