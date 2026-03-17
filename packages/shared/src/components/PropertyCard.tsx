/**
 * PropertyCard — Reusable property listing card
 * Variants: 'full' (vertical, used in home/search), 'compact' (horizontal, used in saved/landlord list)
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Property } from '../types/property';
import { formatCurrency } from '../utils/currency';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const SUCCESS = '#2E7D32';

interface PropertyCardProps {
  property: Property;
  variant?: 'full' | 'compact' | 'horizontal';
  onPress: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  variant = 'full',
  onPress,
  onSave,
  isSaved = false,
  style,
}) => {
  const primaryPhoto = property.media?.photos?.find(p => p.isPrimary) || property.media?.photos?.[0];
  const photoUrl = primaryPhoto?.url;

  const bedroomLabel = property.details.bedrooms === 0
    ? 'Self Contained'
    : `${property.details.bedrooms} bed${property.details.bedrooms > 1 ? 's' : ''}`;

  if (variant === 'compact') {
    return (
      <TouchableOpacity style={[styles.compactCard, style]} onPress={onPress} activeOpacity={0.8}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.compactImage} />
        ) : (
          <View style={[styles.compactImage, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>🏠</Text>
          </View>
        )}
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>{property.title}</Text>
          <Text style={styles.compactPrice}>{formatCurrency(property.pricing.annualRent)}/yr</Text>
          <Text style={styles.compactLocation} numberOfLines={1}>📍 {property.location.area}</Text>
          <View style={styles.compactDetails}>
            <Text style={styles.detailChip}>🛏 {bedroomLabel}</Text>
            <Text style={styles.detailChip}>🚿 {property.details.bathrooms} bath</Text>
          </View>
        </View>
        {onSave && (
          <TouchableOpacity style={styles.compactSaveBtn} onPress={onSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 20 }}>{isSaved ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // Full variant (vertical card)
  return (
    <TouchableOpacity style={[styles.fullCard, style]} onPress={onPress} activeOpacity={0.8}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.fullImage} />
        ) : (
          <View style={[styles.fullImage, styles.imagePlaceholder]}>
            <Text style={styles.placeholderTextLg}>🏠</Text>
          </View>
        )}
        {/* Save button */}
        {onSave && (
          <TouchableOpacity style={styles.saveButton} onPress={onSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 22 }}>{isSaved ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}
        {/* Featured badge */}
        {property.status?.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>⭐ Featured</Text>
          </View>
        )}
        {/* Verified badge */}
        {property.status?.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.fullContent}>
        {/* Title */}
        <Text style={styles.fullTitle} numberOfLines={2}>{property.title}</Text>

        {/* Price */}
        <Text style={styles.fullPrice}>{formatCurrency(property.pricing.annualRent)}<Text style={styles.perYear}>/year</Text></Text>

        {/* Location */}
        <Text style={styles.fullLocation} numberOfLines={1}>📍 {property.location.address}</Text>

        {/* Specs row */}
        <View style={styles.specsRow}>
          <View style={styles.specChip}>
            <Text style={styles.specText}>🛏 {bedroomLabel}</Text>
          </View>
          <View style={styles.specChip}>
            <Text style={styles.specText}>🚿 {property.details.bathrooms} bath</Text>
          </View>
          {property.details.furnishing && (
            <View style={styles.specChip}>
              <Text style={styles.specText}>
                {property.details.furnishing === 'fully_furnished' ? '🛋 Furnished' :
                  property.details.furnishing === 'semi_furnished' ? '🪑 Semi' : '📦 Unfurnished'}
              </Text>
            </View>
          )}
        </View>

        {/* Amenities preview */}
        {property.amenities && property.amenities.length > 0 && (
          <Text style={styles.amenitiesPreview} numberOfLines={1}>
            {property.amenities.slice(0, 3).join(' · ')}
            {property.amenities.length > 3 ? ` +${property.amenities.length - 3}` : ''}
          </Text>
        )}

        {/* Agent savings badge */}
        {property.pricing?.agentSavings > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>
              💰 Save {formatCurrency(property.pricing.agentSavings)} vs. agent
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Full card
  fullCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  photoContainer: {
    position: 'relative',
  },
  fullImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E0E0E0',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 30 },
  placeholderTextLg: { fontSize: 48 },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF6F00',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featuredText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  verifiedBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  fullContent: { padding: 14 },
  fullTitle: { fontSize: 16, fontWeight: '700', color: TEXT_COLOR, marginBottom: 4 },
  fullPrice: { fontSize: 20, fontWeight: '800', color: PRIMARY, marginBottom: 4 },
  perYear: { fontSize: 13, fontWeight: '400', color: TEXT_SECONDARY },
  fullLocation: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 10 },
  specsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  specChip: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  specText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  amenitiesPreview: { fontSize: 12, color: TEXT_SECONDARY, marginBottom: 8 },
  savingsBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  savingsText: { fontSize: 12, color: SUCCESS, fontWeight: '600' },

  // Compact card
  compactCard: {
    backgroundColor: SURFACE,
    borderRadius: 10,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    alignItems: 'center',
  },
  compactImage: {
    width: 100,
    height: 90,
    backgroundColor: '#E0E0E0',
  },
  compactContent: { flex: 1, padding: 10 },
  compactTitle: { fontSize: 14, fontWeight: '700', color: TEXT_COLOR, marginBottom: 3 },
  compactPrice: { fontSize: 15, fontWeight: '800', color: PRIMARY, marginBottom: 3 },
  compactLocation: { fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 },
  compactDetails: { flexDirection: 'row', gap: 6 },
  detailChip: { fontSize: 11, color: PRIMARY, backgroundColor: PRIMARY_LIGHT, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  compactSaveBtn: { padding: 10 },
});
