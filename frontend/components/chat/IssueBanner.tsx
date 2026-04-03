import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import type { Issue } from '@/types/chat.types';
import { ISSUE_BADGE_COLORS, ISSUE_PRIORITY_COLORS } from '@/types/chat.types';

interface IssueBannerProps {
  issue: Issue;
  onPress: () => void;
  onDismiss?: () => void;
}

export const IssueBanner: React.FC<IssueBannerProps> = ({
  issue,
  onPress,
  onDismiss,
}) => {
  const badgeColors = ISSUE_BADGE_COLORS[issue.category] || ISSUE_BADGE_COLORS.other;
  const priorityColors = ISSUE_PRIORITY_COLORS[issue.priority];

  const statusConfig = {
    OPEN: { icon: 'alert-circle-outline', color: '#F44336', label: 'Open' },
    IN_PROGRESS: { icon: 'time-outline', color: '#FF9800', label: 'In Progress' },
    RESOLVED: { icon: 'checkmark-circle-outline', color: '#4CAF50', label: 'Resolved' },
    CLOSED: { icon: 'checkmark-done-circle-outline', color: '#2196F3', label: 'Closed' },
  };

  const status = statusConfig[issue.status];

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: badgeColors.bg + '15' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="warning" size={18} color={badgeColors.bg} />
          <Text style={styles.title}>Issue: {issue.title}</Text>
        </View>

        {onDismiss && issue.status === 'OPEN' && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <Ionicons name="close" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {issue.description}
      </Text>

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
          <Text style={styles.badgeText}>{issue.category.replace('_', ' ')}</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: priorityColors.bg }]}>
          <Text style={[styles.badgeText, styles.priorityText]}>{issue.priority}</Text>
        </View>

        <View style={styles.statusBadge}>
          <Ionicons name={status.icon as any} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {issue.status === 'RESOLVED' && (
        <View style={styles.resolvedNote}>
          <Ionicons name="lock-closed" size={14} color={COLORS.gray} />
          <Text style={styles.resolvedNoteText}>
            This issue is resolved. Chat is now view-only.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tap to {issue.status === 'RESOLVED' ? 'view details' : 'continue discussion'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  dismissBtn: {
    padding: 4,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resolvedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.grayLight,
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  resolvedNoteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
  },
});
