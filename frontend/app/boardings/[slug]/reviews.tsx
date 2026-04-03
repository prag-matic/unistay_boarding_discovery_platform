import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/store/auth.store';
import { getBoardingBySlug } from '@/lib/boarding';
import {
  addComment,
  createReview,
  deleteComment,
  deleteReview,
  getBoardingReviewsById,
  getReviewById,
  getReviewStats,
  reactToComment,
  reactToReview,
  updateComment,
  updateReview,
} from '@/lib/review';
import { COLORS } from '@/lib/constants';
import type { Boarding } from '@/types/boarding.types';
import type {
  Review,
  ReviewComment,
  ReviewMedia,
  ReviewReactionSummary,
  ReviewStats,
  ReactionType,
} from '@/types/review.types';

const PAGE_LIMIT = 10;
const MAX_IMAGES = 5;
const MAX_FILE_MB = 10;
const MAX_COMMENT_CHARS = 500;
const MAX_REVIEW_CHARS = 1000;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const RATING_KEYS = [1, 2, 3, 4, 5] as const;
type RatingKey = (typeof RATING_KEYS)[number];

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} activeOpacity={0.7}>
          <Ionicons name={s <= value ? 'star' : 'star-outline'} size={34} color="#F59E0B" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.ratingBarRow}>
      <Text style={styles.ratingBarLabel}>{stars}★</Text>
      <View style={styles.ratingBarTrack}>
        <View style={[styles.ratingBarFill, { width: `${pct}%` as `${number}%` }]} />
      </View>
      <Text style={styles.ratingBarCount}>{count}</Text>
    </View>
  );
}

interface PickedMedia {
  uri: string;
  type: 'image' | 'video';
  mimeType: string;
  name: string;
}

function LightboxModal({
  media,
  allMedia,
  onClose,
}: {
  media: ReviewMedia;
  allMedia: ReviewMedia[];
  onClose: () => void;
}) {
  const images = allMedia.filter((m) => m.type === 'image');
  const [currentIdx, setCurrentIdx] = useState(images.findIndex((m) => m.id === media.id));
  const current = images[currentIdx] ?? media;
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.lightboxOverlay}>
        <TouchableOpacity style={styles.lightboxClose} onPress={onClose}>
          <Ionicons name="close" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Image source={{ uri: current.url }} style={styles.lightboxImage} resizeMode="contain" />
        {images.length > 1 && (
          <View style={styles.lightboxNav}>
            <TouchableOpacity
              style={[styles.lightboxNavBtn, currentIdx === 0 && styles.lightboxNavDisabled]}
              onPress={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.lightboxCounter}>{currentIdx + 1} / {images.length}</Text>
            <TouchableOpacity
              style={[styles.lightboxNavBtn, currentIdx === images.length - 1 && styles.lightboxNavDisabled]}
              onPress={() => setCurrentIdx((i) => Math.min(images.length - 1, i + 1))}
              disabled={currentIdx === images.length - 1}
            >
              <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

function MediaGrid({ media, onPress }: { media: ReviewMedia[]; onPress: (item: ReviewMedia) => void }) {
  if (!media.length) return null;
  const shown = media.slice(0, 4);
  const extra = media.length - 4;
  return (
    <View style={styles.mediaGrid}>
      {shown.map((item, idx) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.mediaThumbnail, shown.length === 1 && styles.mediaThumbnailFull]}
          onPress={() => item.type === 'image' && onPress(item)}
          activeOpacity={0.85}
        >
          <Image source={{ uri: item.url }} style={styles.mediaThumbnailImg} />
          {item.type === 'video' && (
            <View style={styles.mediaPlayOverlay}>
              <Ionicons name="play-circle" size={32} color={COLORS.white} />
            </View>
          )}
          {idx === 3 && extra > 0 && (
            <View style={styles.mediaMoreOverlay}>
              <Text style={styles.mediaMoreText}>+{extra}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReactionRow({
  reactions,
  onReact,
  disabled,
}: {
  reactions: ReviewReactionSummary;
  onReact: (type: ReactionType) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.reactionRow}>
      <TouchableOpacity
        style={[styles.reactionBtn, reactions.userReaction === 'LIKE' && styles.reactionBtnActive]}
        onPress={() => !disabled && onReact('LIKE')}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name={reactions.userReaction === 'LIKE' ? 'thumbs-up' : 'thumbs-up-outline'}
          size={15}
          color={reactions.userReaction === 'LIKE' ? COLORS.primary : COLORS.gray}
        />
        <Text style={[styles.reactionCount, reactions.userReaction === 'LIKE' && styles.reactionCountActive]}>
          {reactions.likes}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.reactionBtn, reactions.userReaction === 'DISLIKE' && styles.reactionBtnActiveRed]}
        onPress={() => !disabled && onReact('DISLIKE')}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name={reactions.userReaction === 'DISLIKE' ? 'thumbs-down' : 'thumbs-down-outline'}
          size={15}
          color={reactions.userReaction === 'DISLIKE' ? COLORS.red : COLORS.gray}
        />
        <Text style={[styles.reactionCount, reactions.userReaction === 'DISLIKE' && styles.reactionCountRed]}>
          {reactions.dislikes}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onReact,
  onEdit,
  onDelete,
}: {
  comment: ReviewComment;
  currentUserId?: string;
  onReact: (type: ReactionType) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isOwner = currentUserId === comment.authorId;
  const canEdit = isOwner && !comment.editedAt;
  return (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>{comment.authorName?.charAt(0).toUpperCase() ?? '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{comment.authorName ?? ''}</Text>
          {comment.editedAt && <Text style={styles.editedBadge}>(Edited)</Text>}
          <Text style={styles.commentDate}>
            {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <Text style={styles.commentContent}>{comment.comment}</Text>
        <View style={styles.commentFooter}>
          <ReactionRow reactions={comment.reactions ?? { likes: 0, dislikes: 0, userReaction: null }} onReact={onReact} />
          {isOwner && (
            <View style={styles.commentActions}>
              {canEdit && (
                <TouchableOpacity onPress={onEdit} style={styles.commentActionBtn}>
                  <Ionicons name="pencil-outline" size={13} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onDelete} style={styles.commentActionBtn}>
                <Ionicons name="trash-outline" size={13} color={COLORS.red} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

interface WriteReviewModalProps {
  visible: boolean;
  boardingId: string;
  editTarget: Review | null;
  onClose: () => void;
  onSuccess: (review: Review) => void;
}

function WriteReviewModal({ visible, boardingId, editTarget, onClose, onSuccess }: WriteReviewModalProps) {
  const isEdit = editTarget !== null;
  const [rating, setRating] = useState(editTarget?.rating ?? 0);
  const [commentText, setCommentText] = useState(editTarget?.comment ?? '');
  const [pickedImages, setPickedImages] = useState<PickedMedia[]>([]);
  const [pickedVideo, setPickedVideo] = useState<PickedMedia | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setRating(editTarget?.rating ?? 0);
      setCommentText(editTarget?.comment ?? '');
      setPickedImages([]);
      setPickedVideo(null);
    }
  }, [visible, editTarget]);

  const validateFile = (asset: ImagePicker.ImagePickerAsset, mediaType: 'image' | 'video') => {
    const mimeType = asset.mimeType ?? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
    if ((asset.fileSize ?? 0) > MAX_FILE_MB * 1024 * 1024) {
      Toast.show({ type: 'error', text1: 'File too large', text2: `Exceeds ${MAX_FILE_MB}MB limit.` });
      return false;
    }
    if (mediaType === 'image' && !ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      Toast.show({ type: 'error', text1: 'Invalid format', text2: 'Allowed: JPG, PNG, GIF, WEBP.' });
      return false;
    }
    if (mediaType === 'video' && !ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      Toast.show({ type: 'error', text1: 'Invalid format', text2: 'Allowed: MP4, WEBM, MOV.' });
      return false;
    }
    return true;
  };

  const handlePickImages = async () => {
    if (pickedImages.length >= MAX_IMAGES) {
      Toast.show({ type: 'error', text1: 'Limit reached', text2: `Max ${MAX_IMAGES} images.` });
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission denied' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - pickedImages.length,
      quality: 0.85,
    });
    if (!result.canceled) {
      const valid = result.assets.filter((a) => validateFile(a, 'image'));
      setPickedImages((prev) =>
        [...prev, ...valid.map((a) => ({
          uri: a.uri,
          type: 'image' as const,
          mimeType: a.mimeType ?? 'image/jpeg',
          name: a.fileName ?? `image_${Date.now()}.jpg`,
        }))].slice(0, MAX_IMAGES)
      );
    }
  };

  const handlePickVideo = async () => {
    if (pickedVideo) { Toast.show({ type: 'error', text1: 'Already selected', text2: 'Only 1 video allowed.' }); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Permission denied' }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, quality: 1 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      if (validateFile(a, 'video')) {
        setPickedVideo({ uri: a.uri, type: 'video', mimeType: a.mimeType ?? 'video/mp4', name: a.fileName ?? `video_${Date.now()}.mp4` });
      }
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) { Toast.show({ type: 'error', text1: 'Rating required', text2: 'Please select a star rating.' }); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify({ boardingId, rating, comment: commentText || undefined }));
      pickedImages.forEach((img) => {
        formData.append('images', {
          uri: Platform.OS === 'ios' ? img.uri.replace('file://', '') : img.uri,
          name: img.name,
          type: img.mimeType,
        } as unknown as Blob);
      });
      if (pickedVideo) {
        formData.append('video', {
          uri: Platform.OS === 'ios' ? pickedVideo.uri.replace('file://', '') : pickedVideo.uri,
          name: pickedVideo.name,
          type: pickedVideo.mimeType,
        } as unknown as Blob);
      }
      const result = isEdit && editTarget ? await updateReview(editTarget.id, formData) : await createReview(formData);
      const reviewRes = await getReviewById(result.data.id);
      Toast.show({ type: 'success', text1: isEdit ? 'Review updated' : 'Review submitted' });
      onSuccess(reviewRes.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Submission failed', text2: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{isEdit ? 'Edit Review' : 'Write a Review'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {isEdit && (
            <View style={styles.editWarningBanner}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
              <Text style={styles.editWarningText}>You are only allowed to edit your review once.</Text>
            </View>
          )}
          <Text style={styles.fieldLabel}>Rating *</Text>
          <StarPicker value={rating} onChange={setRating} />
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Comment (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={commentText}
            onChangeText={(t) => setCommentText(t.slice(0, MAX_REVIEW_CHARS))}
            placeholder="Share your experience..."
            placeholderTextColor={COLORS.gray}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={styles.charCounter}>{commentText.length} / {MAX_REVIEW_CHARS}</Text>
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
            Photos (max {MAX_IMAGES}) — JPG, PNG, GIF, WEBP · max {MAX_FILE_MB}MB each
          </Text>
          <View style={styles.mediaPickerRow}>
            {pickedImages.map((img) => (
              <View key={img.uri} style={styles.mediaPickerThumb}>
                <Image source={{ uri: img.uri }} style={styles.mediaPickerThumbImg} />
                <TouchableOpacity
                  style={styles.mediaPickerRemove}
                  onPress={() => setPickedImages((p) => p.filter((x) => x.uri !== img.uri))}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            ))}
            {pickedImages.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.mediaPickerAdd} onPress={handlePickImages}>
                <Ionicons name="image-outline" size={24} color={COLORS.primary} />
                <Text style={styles.mediaPickerAddText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
            Video (max 1) — MP4, WEBM, MOV · max {MAX_FILE_MB}MB
          </Text>
          {pickedVideo ? (
            <View style={styles.videoPreview}>
              <Ionicons name="videocam-outline" size={24} color={COLORS.primary} />
              <Text style={styles.videoPreviewName} numberOfLines={1}>{pickedVideo.name}</Text>
              <TouchableOpacity onPress={() => setPickedVideo(null)}>
                <Ionicons name="close-circle" size={20} color={COLORS.red} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.videoPickerBtn} onPress={handlePickVideo}>
              <Ionicons name="videocam-outline" size={22} color={COLORS.primary} />
              <Text style={styles.videoPickerText}>Pick Video</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.submitBtn, (submitting || rating === 0) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>{isEdit ? 'Update Review' : 'Submit Review'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function EditCommentModal({
  visible,
  initialContent,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialContent: string;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setContent(initialContent);
  }, [visible, initialContent]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try { await onSave(content.trim()); } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Comment</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.editWarningBanner}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
          <Text style={styles.editWarningText}>You are only allowed to edit your comment once.</Text>
        </View>
        <View style={{ padding: 20, flex: 1 }}>
          <TextInput
            style={[styles.textArea, { minHeight: 120 }]}
            value={content}
            onChangeText={(t) => setContent(t.slice(0, MAX_COMMENT_CHARS))}
            placeholder="Edit your comment..."
            placeholderTextColor={COLORS.gray}
            multiline
            textAlignVertical="top"
            autoFocus
          />
          <Text style={styles.charCounter}>{content.length} / {MAX_COMMENT_CHARS}</Text>
        </View>
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.submitBtn, (!content.trim() || saving) && styles.submitBtnDisabled]}
            onPress={handleSave}
            disabled={!content.trim() || saving}
          >
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>Save Comment</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function CommentThread({
  comments,
  loadingComments,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onReactComment,
}: {
  comments: ReviewComment[];
  loadingComments: boolean;
  currentUserId?: string;
  onAddComment: (content: string) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
  onReactComment: (commentId: string, type: ReactionType) => void;
}) {
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [editTarget, setEditTarget] = useState<ReviewComment | null>(null);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try { await onAddComment(newComment.trim()); setNewComment(''); } finally { setPosting(false); }
  };

  return (
    <View style={styles.commentThread}>
      {loadingComments ? (
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 12 }} />
      ) : (
        <>
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              onReact={(type) => onReactComment(c.id, type)}
              onEdit={() => setEditTarget(c)}
              onDelete={() => onDeleteComment(c.id)}
            />
          ))}
          {(comments ?? []).length === 0 && (
            <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
          )}
        </>
      )}
      {currentUserId && (
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            value={newComment}
            onChangeText={(t) => setNewComment(t.slice(0, MAX_COMMENT_CHARS))}
            placeholder="Write a comment..."
            placeholderTextColor={COLORS.gray}
            multiline
          />
          <TouchableOpacity
            style={[styles.commentPostBtn, (!newComment.trim() || posting) && styles.commentPostBtnDisabled]}
            onPress={handlePost}
            disabled={!newComment.trim() || posting}
          >
            {posting ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="send" size={16} color={COLORS.white} />}
          </TouchableOpacity>
        </View>
      )}
      {editTarget && (
        <EditCommentModal
          visible
          initialContent={editTarget.comment}
          onClose={() => setEditTarget(null)}
          onSave={async (content) => { await onEditComment(editTarget.id, content); setEditTarget(null); }}
        />
      )}
    </View>
  );
}

function ReviewCard({
  review,
  currentUserId,
  comments,
  loadingComments,
  commentsExpanded,
  onToggleComments,
  onReact,
  onEdit,
  onDelete,
  onMediaPress,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onReactComment,
}: {
  review: Review;
  currentUserId?: string;
  comments: ReviewComment[];
  loadingComments: boolean;
  commentsExpanded: boolean;
  onToggleComments: () => void;
  onReact: (type: ReactionType) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMediaPress: (item: ReviewMedia) => void;
  onAddComment: (content: string) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
  onReactComment: (commentId: string, type: ReactionType) => void;
}) {
  const isOwner = currentUserId === review.authorId;
  const canEdit = isOwner && !review.editedAt;
  const commentCount = review._count?.comments ?? (comments ?? []).length;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>{review.reviewerName?.charAt(0).toUpperCase() ?? '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.reviewerName}>{review.reviewerName}</Text>
            {review.editedAt && <Text style={styles.editedBadge}>(Edited)</Text>}
          </View>
          <StarRow rating={review.rating} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={styles.reviewDate}>
            {new Date(review.commentedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Text>
          {isOwner && (
            <TouchableOpacity onPress={() => setMenuOpen((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {menuOpen && (
        <View style={styles.optionsMenu}>
          {canEdit && (
            <TouchableOpacity style={styles.optionsMenuItem} onPress={() => { setMenuOpen(false); onEdit(); }}>
              <Ionicons name="pencil-outline" size={15} color={COLORS.text} />
              <Text style={styles.optionsMenuText}>Edit Review</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.optionsMenuItem} onPress={() => { setMenuOpen(false); onDelete(); }}>
            <Ionicons name="trash-outline" size={15} color={COLORS.red} />
            <Text style={[styles.optionsMenuText, { color: COLORS.red }]}>Delete Review</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
      {(review.media ?? []).length > 0 && <MediaGrid media={review.media} onPress={onMediaPress} />}
      <View style={styles.reviewFooter}>
        <ReactionRow reactions={review.reactions ?? { likes: 0, dislikes: 0, userReaction: null }} onReact={onReact} />
        <TouchableOpacity style={styles.replyBtn} onPress={onToggleComments}>
          <Ionicons name="chatbubble-outline" size={15} color={COLORS.gray} />
          <Text style={styles.replyBtnText}>{commentCount}</Text>
          <Ionicons name={commentsExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={COLORS.gray} />
        </TouchableOpacity>
      </View>
      {commentsExpanded && (
        <CommentThread
          comments={comments}
          loadingComments={loadingComments}
          currentUserId={currentUserId}
          onAddComment={onAddComment}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          onReactComment={onReactComment}
        />
      )}
    </View>
  );
}

export default function BoardingReviewsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuthStore();

  const [boarding, setBoarding] = useState<Boarding | null>(null);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<'commentedAt' | 'rating'>('commentedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [reviewComments, setReviewComments] = useState<Record<string, ReviewComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Review | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<ReviewMedia | null>(null);
  const [lightboxReview, setLightboxReview] = useState<Review | null>(null);
  const boardingRef = useRef<Boarding | null>(null);
  const isStudent = user?.role === 'STUDENT';

  const loadReviews = useCallback(
    async (pageNum: number, append: boolean, sb: 'commentedAt' | 'rating', so: 'asc' | 'desc') => {
      const b = boardingRef.current;
      if (!b) return;
      const res = await getBoardingReviewsById(b.id, { page: pageNum, limit: PAGE_LIMIT, sortBy: sb, sortOrder: so });
      const newReviews = res.data.reviews ?? [];
      const { pagination } = res.data;
      setReviews((prev) => (append ? [...prev, ...newReviews] : newReviews));
      setPage(pagination.page);
      setTotalPages(pagination.totalPages);
    },
    [],
  );

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    getBoardingBySlug(slug)
      .then(async (r) => {
        const b = r.data.boarding;
        setBoarding(b);
        boardingRef.current = b;
        await Promise.allSettled([
          getReviewStats(b.id).then((s) => setStats(s.data)).catch(() => {}),
          loadReviews(1, false, sortBy, sortOrder).catch(() => {}),
        ]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleSortChange = async (newSortBy: 'commentedAt' | 'rating', newSortOrder: 'asc' | 'desc') => {
    if (newSortBy === sortBy && newSortOrder === sortOrder) return;
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setIsLoading(true);
    try { await loadReviews(1, false, newSortBy, newSortOrder); }
    catch { Toast.show({ type: 'error', text1: 'Failed to sort reviews' }); }
    finally { setIsLoading(false); }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    try { await loadReviews(page + 1, true, sortBy, sortOrder); }
    catch { Toast.show({ type: 'error', text1: 'Failed to load more' }); }
    finally { setIsLoadingMore(false); }
  };

  const toggleComments = async (reviewId: string) => {
    if (expandedComments.has(reviewId)) {
      setExpandedComments((prev) => { const n = new Set(prev); n.delete(reviewId); return n; });
      return;
    }
    setExpandedComments((prev) => new Set([...prev, reviewId]));
    if (reviewComments[reviewId]) return;
    setLoadingComments((prev) => new Set([...prev, reviewId]));
    try {
      const res = await getReviewById(reviewId);
      setReviewComments((prev) => ({ ...prev, [reviewId]: res.data.comments ?? [] }));
    } catch { Toast.show({ type: 'error', text1: 'Failed to load comments' }); }
    finally {
      setLoadingComments((prev) => { const n = new Set(prev); n.delete(reviewId); return n; });
    }
  };

  const handleAddComment = async (reviewId: string, content: string) => {
    await addComment(reviewId, { comment: content });
    const reviewRes = await getReviewById(reviewId);
    setReviewComments((prev) => ({ ...prev, [reviewId]: reviewRes.data.comments ?? [] }));
    setReviews((prev) =>
      prev.map((r) => r.id === reviewId ? { ...r, _count: { comments: (r._count?.comments ?? 0) + 1 } } : r)
    );
  };

  const handleEditComment = async (reviewId: string, commentId: string, content: string) => {
    const res = await updateComment(commentId, { comment: content });
    setReviewComments((prev) => ({
      ...prev,
      [reviewId]: (prev[reviewId] ?? []).map((c) =>
        c.id === commentId ? { ...c, comment: content, editedAt: res.data.editedAt } : c
      ),
    }));
  };

  const handleDeleteComment = (reviewId: string, commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentId);
            setReviewComments((prev) => ({ ...prev, [reviewId]: (prev[reviewId] ?? []).filter((c) => c.id !== commentId) }));
            setReviews((prev) =>
              prev.map((r) => r.id === reviewId ? { ...r, _count: { comments: Math.max(0, (r._count?.comments ?? 1) - 1) } } : r)
            );
          } catch { Toast.show({ type: 'error', text1: 'Failed to delete comment' }); }
        },
      },
    ]);
  };

  const applyOptimisticReaction = (reactions: ReviewReactionSummary | null | undefined, type: ReactionType): ReviewReactionSummary => {
    const safe = reactions ?? { likes: 0, dislikes: 0, userReaction: null };
    const prev = safe.userReaction;
    if (prev === type) {
      return { userReaction: null, likes: type === 'LIKE' ? safe.likes - 1 : safe.likes, dislikes: type === 'DISLIKE' ? safe.dislikes - 1 : safe.dislikes };
    }
    return {
      userReaction: type,
      likes: type === 'LIKE' ? safe.likes + 1 : prev === 'LIKE' ? safe.likes - 1 : safe.likes,
      dislikes: type === 'DISLIKE' ? safe.dislikes + 1 : prev === 'DISLIKE' ? safe.dislikes - 1 : safe.dislikes,
    };
  };

  const handleReactToReview = async (reviewId: string, type: ReactionType) => {
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;
    const prevReactions = review.reactions;
    setReviews((rs) => rs.map((r) => r.id === reviewId ? { ...r, reactions: applyOptimisticReaction(r.reactions, type) } : r));
    try { await reactToReview(reviewId, type); }
    catch {
      setReviews((rs) => rs.map((r) => r.id === reviewId ? { ...r, reactions: prevReactions } : r));
      Toast.show({ type: 'error', text1: 'Reaction failed', text2: 'Please try again.' });
    }
  };

  const handleReactToComment = async (reviewId: string, commentId: string, type: ReactionType) => {
    const prevComments = reviewComments[reviewId] ?? [];
    const comment = prevComments.find((c) => c.id === commentId);
    if (!comment) return;
    const prevReactions = comment.reactions;
    setReviewComments((all) => ({
      ...all,
      [reviewId]: prevComments.map((c) => c.id === commentId ? { ...c, reactions: applyOptimisticReaction(c.reactions, type) } : c),
    }));
    try { await reactToComment(commentId, type); }
    catch {
      setReviewComments((all) => ({ ...all, [reviewId]: prevComments.map((c) => c.id === commentId ? { ...c, reactions: prevReactions } : c) }));
      Toast.show({ type: 'error', text1: 'Reaction failed', text2: 'Please try again.' });
    }
  };

  const handleWriteReviewSuccess = (review: Review) => {
    setWriteModalVisible(false);
    if (editTarget) {
      setReviews((prev) => prev.map((r) => r.id === review.id ? review : r));
    } else {
      setReviews((prev) => [review, ...prev]);
      if (stats) {
        const newTotal = stats.totalReviews + 1;
        const newAvg =
          Math.round(
            ((stats.averageRating * stats.totalReviews + review.rating) / newTotal) * 10,
          ) / 10;
        const ratingKey = review.rating as RatingKey;
        setStats({
          ...stats,
          totalReviews: newTotal,
          averageRating: newAvg,
          ratingDistribution: {
            ...stats.ratingDistribution,
            [ratingKey]: (stats.ratingDistribution[ratingKey] ?? 0) + 1,
          },
        });
      }
    }
    setEditTarget(null);
  };

  const handleDeleteReview = (reviewId: string) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteReview(reviewId);
            setReviews((prev) => prev.filter((r) => r.id !== reviewId));
            Toast.show({ type: 'success', text1: 'Review deleted' });
          } catch { Toast.show({ type: 'error', text1: 'Failed to delete review' }); }
        },
      },
    ]);
  };

  const totalReviews = stats?.totalReviews ?? 0;
  const averageRating = stats?.averageRating ?? 0;

  const SORT_OPTIONS = [
    { label: 'Newest', sortBy: 'commentedAt' as const, sortOrder: 'desc' as const },
    { label: 'Highest', sortBy: 'rating' as const, sortOrder: 'desc' as const },
    { label: 'Lowest', sortBy: 'rating' as const, sortOrder: 'asc' as const },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {boarding ? `Reviews · ${boarding.title}` : 'Reviews'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statsCard}>
            <View style={styles.statsLeft}>
              <Text style={styles.statsScore}>{averageRating.toFixed(1)}</Text>
              <StarRow rating={averageRating} size={16} />
              <Text style={styles.statsCount}>{totalReviews} reviews</Text>
            </View>
            <View style={styles.statsRight}>
              {RATING_KEYS.slice().reverse().map((s) => (
                <RatingBar
                  key={s}
                  stars={s}
                  count={stats?.ratingDistribution[s] ?? 0}
                  total={totalReviews}
                />
              ))}
            </View>
          </View>

          <View style={styles.controlsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SORT_OPTIONS.map((opt) => {
                const active = sortBy === opt.sortBy && sortOrder === opt.sortOrder;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                    onPress={() => handleSortChange(opt.sortBy, opt.sortOrder)}
                  >
                    <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {isStudent && (
              <TouchableOpacity style={styles.writeReviewBtn} onPress={() => { setEditTarget(null); setWriteModalVisible(true); }}>
                <Ionicons name="create-outline" size={16} color={COLORS.white} />
                <Text style={styles.writeReviewBtnText}>Review</Text>
              </TouchableOpacity>
            )}
          </View>

          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={user?.id}
              comments={reviewComments[review.id] ?? []}
              loadingComments={loadingComments.has(review.id)}
              commentsExpanded={expandedComments.has(review.id)}
              onToggleComments={() => toggleComments(review.id)}
              onReact={(type) => handleReactToReview(review.id, type)}
              onEdit={() => { setEditTarget(review); setWriteModalVisible(true); }}
              onDelete={() => handleDeleteReview(review.id)}
              onMediaPress={(item) => { setLightboxMedia(item); setLightboxReview(review); }}
              onAddComment={(content) => handleAddComment(review.id, content)}
              onEditComment={(commentId, content) => handleEditComment(review.id, commentId, content)}
              onDeleteComment={(commentId) => handleDeleteComment(review.id, commentId)}
              onReactComment={(commentId, type) => handleReactToComment(review.id, commentId, type)}
            />
          ))}

          {reviews.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={56} color={COLORS.grayBorder} />
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptySub}>Be the first to leave a review</Text>
              {isStudent && (
                <TouchableOpacity style={[styles.writeReviewBtn, { marginTop: 12 }]} onPress={() => { setEditTarget(null); setWriteModalVisible(true); }}>
                  <Ionicons name="create-outline" size={16} color={COLORS.white} />
                  <Text style={styles.writeReviewBtnText}>Write a Review</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {page < totalPages && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.loadMoreText}>Load More</Text>}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {writeModalVisible && boarding && (
        <WriteReviewModal
          visible={writeModalVisible}
          boardingId={boarding.id}
          editTarget={editTarget}
          onClose={() => { setWriteModalVisible(false); setEditTarget(null); }}
          onSuccess={handleWriteReviewSuccess}
        />
      )}

      {lightboxMedia && lightboxReview && (
        <LightboxModal
          media={lightboxMedia}
          allMedia={lightboxReview.media}
          onClose={() => { setLightboxMedia(null); setLightboxReview(null); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayBorder,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.text },
  content: { padding: 16, gap: 12 },
  statsCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  statsLeft: { alignItems: 'center', gap: 4, minWidth: 72 },
  statsScore: { fontSize: 40, fontWeight: '800', color: COLORS.text },
  statsCount: { fontSize: 12, color: COLORS.textSecondary },
  statsRight: { flex: 1, gap: 4, justifyContent: 'center' },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingBarLabel: { fontSize: 12, color: COLORS.textSecondary, width: 20 },
  ratingBarTrack: { flex: 1, height: 6, backgroundColor: COLORS.grayLight, borderRadius: 3, overflow: 'hidden' },
  ratingBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  ratingBarCount: { fontSize: 12, color: COLORS.textSecondary, width: 20, textAlign: 'right' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sortChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.grayBorder },
  sortChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortChipText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  sortChipTextActive: { color: COLORS.white },
  writeReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.primary },
  writeReviewBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  reviewCard: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  editedBadge: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic' },
  reviewDate: { fontSize: 11, color: COLORS.gray },
  reviewComment: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 10 },
  optionsMenu: {
    position: 'absolute', top: 44, right: 14, zIndex: 10, backgroundColor: COLORS.white, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.grayBorder, paddingVertical: 4, minWidth: 160,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  optionsMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  optionsMenuText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  mediaThumbnail: { width: '48%', aspectRatio: 1.4, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  mediaThumbnailFull: { width: '100%' },
  mediaThumbnailImg: { width: '100%', height: '100%' },
  mediaPlayOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  mediaMoreOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  mediaMoreText: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  reviewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  reactionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: COLORS.grayLight },
  reactionBtnActive: { backgroundColor: '#EFF6FF' },
  reactionBtnActiveRed: { backgroundColor: '#FEF2F2' },
  reactionCount: { fontSize: 12, fontWeight: '600', color: COLORS.gray },
  reactionCountActive: { color: COLORS.primary },
  reactionCountRed: { color: COLORS.red },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: COLORS.grayLight },
  replyBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.gray },
  commentThread: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.grayBorder, paddingTop: 10, gap: 10 },
  noCommentsText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 8 },
  commentItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  commentDate: { fontSize: 11, color: COLORS.gray },
  commentContent: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginTop: 2 },
  commentFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  commentActions: { flexDirection: 'row', gap: 8 },
  commentActionBtn: { padding: 4 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: COLORS.grayBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: COLORS.text, maxHeight: 80, minHeight: 40 },
  commentPostBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  commentPostBtnDisabled: { backgroundColor: COLORS.grayBorder },
  loadMoreBtn: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.grayBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, marginTop: 4 },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayBorder },
  modalCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.text },
  modalContent: { padding: 20, gap: 6 },
  editWarningBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: '#FED7AA' },
  editWarningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  textArea: { borderWidth: 1, borderColor: COLORS.grayBorder, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 100, backgroundColor: COLORS.white },
  charCounter: { fontSize: 11, color: COLORS.gray, textAlign: 'right', marginTop: 4 },
  mediaPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  mediaPickerThumb: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  mediaPickerThumbImg: { width: '100%', height: '100%' },
  mediaPickerRemove: { position: 'absolute', top: 2, right: 2 },
  mediaPickerAdd: { width: 72, height: 72, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', gap: 2 },
  mediaPickerAddText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  videoPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.grayBorder, padding: 12, marginTop: 6 },
  videoPreviewName: { flex: 1, fontSize: 13, color: COLORS.text },
  videoPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.grayBorder, borderRadius: 10, padding: 14, marginTop: 6, justifyContent: 'center' },
  videoPickerText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  modalFooter: { padding: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.grayBorder },
  submitBtn: { height: 50, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { backgroundColor: COLORS.grayBorder },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  lightboxClose: { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8 },
  lightboxImage: { width: '100%', height: '80%' },
  lightboxNav: { position: 'absolute', bottom: 60, flexDirection: 'row', alignItems: 'center', gap: 24 },
  lightboxNavBtn: { padding: 12 },
  lightboxNavDisabled: { opacity: 0.3 },
  lightboxCounter: { fontSize: 14, color: COLORS.white, fontWeight: '600' },
});
