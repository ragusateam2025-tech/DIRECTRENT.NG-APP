import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { Review } from '../types/review';
import { StarRating } from './StarRating';

const PRIMARY = '#1B5E20';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SECONDARY = '#FF6F00';

interface ReviewCardProps {
  review: Review;
  reviewerName: string;
  reviewerPhoto?: string;
  showResponse?: boolean;
  style?: StyleProp<ViewStyle>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getRelativeDate(timestamp: { toDate: () => Date } | null | undefined): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}

function getOverallRating(review: Review): number {
  if (review.landlordRating) return review.landlordRating.overall;
  if (review.tenantRating) return review.tenantRating.overall;
  return 0;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  reviewerName,
  reviewerPhoto,
  showResponse = true,
  style,
}) => {
  const overallRating = getOverallRating(review);
  const relativeDate = getRelativeDate(review.createdAt);
  const responseLabel =
    review.reviewerType === 'tenant' ? 'Response from owner' : 'Response from tenant';

  return (
    <View style={[styles.card, style]}>
      {/* Header row: avatar + name + date */}
      <View style={styles.headerRow}>
        {reviewerPhoto ? (
          <Image source={{ uri: reviewerPhoto }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{getInitials(reviewerName)}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.reviewerName}>{reviewerName}</Text>
          {relativeDate ? (
            <Text style={styles.reviewDate}>{relativeDate}</Text>
          ) : null}
        </View>
      </View>

      {/* Star rating */}
      <View style={styles.ratingRow}>
        <StarRating rating={overallRating} size={16} />
        <Text style={styles.ratingValue}>{overallRating.toFixed(1)}</Text>
      </View>

      {/* Comment */}
      <Text style={styles.comment}>{review.comment}</Text>

      {/* Response box */}
      {showResponse && review.response ? (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>{responseLabel}</Text>
          <Text style={styles.responseText}>{review.response}</Text>
          {review.respondedAt ? (
            <Text style={styles.responseDate}>{getRelativeDate(review.respondedAt)}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BORDER,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  headerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  reviewDate: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: SECONDARY,
    marginLeft: 6,
  },
  comment: {
    fontSize: 14,
    color: TEXT_COLOR,
    lineHeight: 20,
  },
  responseBox: {
    marginTop: 12,
    backgroundColor: BG,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    borderRadius: 6,
    padding: 10,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 4,
  },
  responseText: {
    fontSize: 13,
    color: TEXT_COLOR,
    lineHeight: 19,
  },
  responseDate: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
});
