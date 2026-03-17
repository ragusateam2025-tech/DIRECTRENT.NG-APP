import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  color?: string;
  emptyColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 20,
  interactive = false,
  onRatingChange,
  color = '#FF6F00',
  emptyColor = '#E0E0E0',
  style,
}) => {
  const displayRating = interactive ? Math.round(rating) : Math.round(rating);

  const handlePress = (starIndex: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starIndex);
    }
  };

  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  if (interactive) {
    return (
      <View style={[styles.container, style]}>
        {stars.map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => handlePress(star)}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.star,
                { fontSize: size, color: star <= displayRating ? color : emptyColor },
              ]}
            >
              {star <= displayRating ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {stars.map(star => (
        <Text
          key={star}
          style={[
            styles.star,
            { fontSize: size, color: star <= displayRating ? color : emptyColor },
          ]}
        >
          {star <= displayRating ? '★' : '☆'}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 1,
  },
});
