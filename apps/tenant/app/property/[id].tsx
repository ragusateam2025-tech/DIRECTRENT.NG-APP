import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { RootState } from '../../store';
import { PropertyService } from '../../../../packages/shared/src/services/property.service';
import { formatCurrency } from '../../../../packages/shared/src/utils/currency';
import type { Property } from '../../../../packages/shared/src/types/property';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';

interface LandlordPreview {
  uid: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  verified: boolean;
  rating: { average: number; count: number };
  portfolio: { totalProperties: number };
  createdAt: { toDate?: () => Date; seconds?: number } | null;
  responseMetrics?: { averageResponseTime: number };
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [property, setProperty] = useState<Property | null>(null);
  const [landlord, setLandlord] = useState<LandlordPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  const viewTracked = useRef(false);

  useEffect(() => {
    if (!id) return;

    const loadProperty = async () => {
      try {
        const prop = await PropertyService.getProperty(id as string);
        if (!prop) {
          setLoading(false);
          return;
        }
        setProperty(prop);

        // Load landlord preview
        const [userDoc, landlordDoc] = await Promise.all([
          firestore().collection('users').doc(prop.landlordId).get(),
          firestore().collection('landlords').doc(prop.landlordId).get(),
        ]);

        if (userDoc.exists) {
          const userData = userDoc.data()!;
          const landlordData = landlordDoc.data() ?? {};
          setLandlord({
            uid: prop.landlordId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            photoUrl: userData.photoUrl,
            verified: userData.verification?.bvn?.status === 'verified' || userData.verification?.nin?.status === 'verified',
            rating: landlordData.rating ?? { average: 0, count: 0 },
            portfolio: landlordData.portfolio ?? { totalProperties: 0 },
            createdAt: userData.createdAt,
            responseMetrics: landlordData.responseMetrics,
          });
        }

        // Check if saved
        if (uid) {
          const tenantDoc = await firestore().collection('tenants').doc(uid).get();
          const saved: string[] = tenantDoc.data()?.savedProperties ?? [];
          setIsSaved(saved.includes(id as string));
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id, uid]);

  // Track view count once
  useEffect(() => {
    if (!id || viewTracked.current) return;
    viewTracked.current = true;
    try {
      functions().httpsCallable('trackView')({ propertyId: id });
    } catch {
      // non-critical
    }
  }, [id]);

  const handleToggleSave = useCallback(async () => {
    if (!uid || !id) return;
    const next = !isSaved;
    setIsSaved(next);
    try {
      if (next) {
        await PropertyService.saveProperty(uid, id as string);
      } else {
        await PropertyService.unsaveProperty(uid, id as string);
      }
    } catch {
      setIsSaved(!next);
    }
  }, [uid, id, isSaved]);

  const handleOpenMaps = useCallback(() => {
    if (!property) return;
    const { latitude, longitude } = property.location.coordinates;
    const label = encodeURIComponent(property.location.address);
    const url = Platform.OS === 'ios'
      ? `maps://?q=${label}&ll=${latitude},${longitude}`
      : `geo:${latitude},${longitude}?q=${label}`;
    Linking.openURL(url);
  }, [property]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading property...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 48 }}>🏚️</Text>
          <Text style={styles.errorTitle}>Property not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const photos = property.media?.photos ?? [];
  const bedroomLabel = property.details.bedrooms === 0
    ? 'Self Contained'
    : `${property.details.bedrooms} Bed${property.details.bedrooms > 1 ? 's' : ''}`;

  const furnishingLabel = property.details.furnishing === 'fully_furnished'
    ? 'Furnished'
    : property.details.furnishing === 'semi_furnished'
    ? 'Semi-Furnished'
    : 'Unfurnished';

  const memberYear = landlord?.createdAt?.toDate
    ? new Date(landlord.createdAt.toDate()).getFullYear()
    : null;

  return (
    <View style={styles.container}>
      {/* Back + action bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.topBtn} onPress={() => router.back()}>
          <Text style={styles.topBtnIcon}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBtn} onPress={handleToggleSave}>
          <Text style={{ fontSize: 22 }}>{isSaved ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo Gallery */}
        <View style={styles.galleryContainer}>
          {photos.length > 0 ? (
            <>
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                onMomentumScrollEnd={e => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setPhotoIndex(idx);
                }}
                renderItem={({ item }) => (
                  <Image source={{ uri: item.url }} style={styles.galleryImage} />
                )}
              />
              <View style={styles.photoCounter}>
                <Text style={styles.photoCounterText}>{photoIndex + 1}/{photos.length}</Text>
              </View>
              <View style={styles.photoDots}>
                {photos.slice(0, 8).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === photoIndex && styles.dotActive]}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={[styles.galleryImage, styles.photoPlaceholder]}>
              <Text style={{ fontSize: 64 }}>🏠</Text>
            </View>
          )}

          {property.status?.featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>⭐ Featured</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Title + badges */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{property.title}</Text>
            </View>
            {property.status?.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>

          {/* Price */}
          <Text style={styles.price}>
            {formatCurrency(property.pricing.annualRent)}
            <Text style={styles.perYear}>/year</Text>
          </Text>

          {/* Location */}
          <TouchableOpacity onPress={handleOpenMaps} style={styles.locationRow}>
            <Text style={styles.locationText}>📍 {property.location.address}</Text>
          </TouchableOpacity>

          {/* Specs */}
          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <Text style={styles.specIcon}>🛏</Text>
              <Text style={styles.specValue}>{bedroomLabel}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specIcon}>🚿</Text>
              <Text style={styles.specValue}>{property.details.bathrooms} Bath{property.details.bathrooms > 1 ? 's' : ''}</Text>
            </View>
            {property.details.sizeSqm && (
              <View style={styles.specItem}>
                <Text style={styles.specIcon}>📐</Text>
                <Text style={styles.specValue}>{property.details.sizeSqm} sqm</Text>
              </View>
            )}
            <View style={styles.specItem}>
              <Text style={styles.specIcon}>🛋</Text>
              <Text style={styles.specValue}>{furnishingLabel}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text
              style={styles.description}
              numberOfLines={descExpanded ? undefined : 4}
            >
              {property.description}
            </Text>
            <TouchableOpacity onPress={() => setDescExpanded(v => !v)}>
              <Text style={styles.readMore}>{descExpanded ? 'Show less' : 'Read more'}</Text>
            </TouchableOpacity>
          </View>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {property.amenities.map(a => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Cost Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cost Breakdown</Text>
            <View style={styles.costCard}>
              <CostRow label="Annual Rent" value={property.pricing.annualRent} />
              {property.pricing.cautionDeposit > 0 && (
                <CostRow label="Caution Deposit" value={property.pricing.cautionDeposit} />
              )}
              {property.pricing.serviceCharge > 0 && (
                <CostRow label="Service Charge" value={property.pricing.serviceCharge} />
              )}
              {property.pricing.agreementFee > 0 && (
                <CostRow label="Agreement Fee" value={property.pricing.agreementFee} />
              )}
              {property.pricing.platformFee > 0 && (
                <CostRow label="Platform Fee (2%)" value={property.pricing.platformFee} />
              )}
              <View style={styles.costDivider} />
              <View style={styles.costTotalRow}>
                <Text style={styles.costTotalLabel}>TOTAL UPFRONT</Text>
                <Text style={styles.costTotalValue}>
                  {formatCurrency(property.pricing.totalUpfront || (
                    property.pricing.annualRent +
                    (property.pricing.cautionDeposit || 0) +
                    (property.pricing.serviceCharge || 0) +
                    (property.pricing.agreementFee || 0) +
                    (property.pricing.platformFee || 0)
                  ))}
                </Text>
              </View>
              {(property.pricing.agentSavings || 0) > 0 && (
                <View style={styles.savingsBanner}>
                  <Text style={styles.savingsText}>
                    💰 You save {formatCurrency(property.pricing.agentSavings)} vs. using an agent!
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Location Map placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity style={styles.mapPlaceholder} onPress={handleOpenMaps}>
              <Text style={{ fontSize: 32 }}>🗺️</Text>
              <Text style={styles.mapLabel}>{property.location.area}, Lagos</Text>
              <Text style={styles.mapSub}>Tap to open in Maps</Text>
            </TouchableOpacity>
            {property.location.nearbyLandmarks && property.location.nearbyLandmarks.length > 0 && (
              <Text style={styles.landmarks}>
                Nearby: {property.location.nearbyLandmarks.slice(0, 3).join(' · ')}
              </Text>
            )}
          </View>

          {/* Landlord Card */}
          {landlord && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Landlord</Text>
              <TouchableOpacity
                style={styles.landlordCard}
                onPress={() => router.push(`/landlord/${landlord.uid}`)}
                activeOpacity={0.8}
              >
                <View style={styles.landlordLeft}>
                  {landlord.photoUrl ? (
                    <Image source={{ uri: landlord.photoUrl }} style={styles.landlordPhoto} />
                  ) : (
                    <View style={[styles.landlordPhoto, styles.landlordPhotoPlaceholder]}>
                      <Text style={{ fontSize: 24 }}>👤</Text>
                    </View>
                  )}
                </View>
                <View style={styles.landlordInfo}>
                  <View style={styles.landlordNameRow}>
                    <Text style={styles.landlordName}>
                      {landlord.firstName} {landlord.lastName}
                    </Text>
                    {landlord.verified && (
                      <View style={styles.landlordVerified}>
                        <Text style={styles.landlordVerifiedText}>✓</Text>
                      </View>
                    )}
                  </View>
                  {landlord.rating.count > 0 && (
                    <Text style={styles.landlordRating}>
                      ⭐ {landlord.rating.average.toFixed(1)} ({landlord.rating.count} reviews)
                    </Text>
                  )}
                  <Text style={styles.landlordMeta}>
                    {landlord.portfolio.totalProperties} propert{landlord.portfolio.totalProperties === 1 ? 'y' : 'ies'}
                    {memberYear ? `  ·  Since ${memberYear}` : ''}
                    {landlord.responseMetrics?.averageResponseTime
                      ? `  ·  Responds in ~${landlord.responseMetrics.averageResponseTime}h`
                      : ''}
                  </Text>
                </View>
                <Text style={styles.landlordChevron}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <SafeAreaView style={styles.actionBar} edges={['bottom']}>
        <TouchableOpacity
          style={styles.msgBtn}
          onPress={() => {
            if (!property) return;
            router.push({
              pathname: '/(tabs)/messages',
              params: { propertyId: property.id, landlordId: property.landlordId },
            });
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.msgBtnText}>💬 Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={() => router.push(`/application/${id}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.applyBtnText}>Apply Now →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.costRow}>
      <Text style={styles.costLabel}>{label}</Text>
      <Text style={styles.costValue}>{formatCurrency(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: TEXT_SECONDARY, fontSize: 14 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: TEXT_COLOR, marginTop: 12 },
  backBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topBtn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  topBtnIcon: { fontSize: 18, fontWeight: '700', color: TEXT_COLOR },

  galleryContainer: { position: 'relative' },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 280,
    backgroundColor: '#E0E0E0',
  },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  photoCounter: {
    position: 'absolute',
    bottom: 40,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoCounterText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  photoDots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: { backgroundColor: '#FFF', width: 16 },
  featuredBadge: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: SECONDARY,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  body: { backgroundColor: SURFACE, paddingTop: 20 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 6,
  },
  title: { fontSize: 20, fontWeight: '800', color: TEXT_COLOR, flex: 1 },
  verifiedBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  verifiedText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  price: { fontSize: 26, fontWeight: '800', color: PRIMARY, paddingHorizontal: 16, marginBottom: 6 },
  perYear: { fontSize: 15, fontWeight: '400', color: TEXT_SECONDARY },

  locationRow: { paddingHorizontal: 16, marginBottom: 16 },
  locationText: { fontSize: 13, color: TEXT_SECONDARY },

  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  specItem: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  specIcon: { fontSize: 20, marginBottom: 4 },
  specValue: { fontSize: 12, fontWeight: '600', color: PRIMARY },

  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: SURFACE,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 12,
    paddingTop: 4,
  },
  description: { fontSize: 14, color: TEXT_COLOR, lineHeight: 22 },
  readMore: { color: PRIMARY, fontSize: 13, fontWeight: '600', marginTop: 6 },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  amenityText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  costCard: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  costLabel: { fontSize: 14, color: TEXT_SECONDARY },
  costValue: { fontSize: 14, fontWeight: '600', color: TEXT_COLOR },
  costDivider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  costTotalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  costTotalLabel: { fontSize: 13, fontWeight: '700', color: TEXT_COLOR },
  costTotalValue: { fontSize: 18, fontWeight: '800', color: PRIMARY },
  savingsBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  savingsText: { fontSize: 13, color: SUCCESS, fontWeight: '600' },

  mapPlaceholder: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    gap: 4,
  },
  mapLabel: { fontSize: 14, fontWeight: '700', color: TEXT_COLOR },
  mapSub: { fontSize: 12, color: TEXT_SECONDARY },
  landmarks: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 8 },

  landlordCard: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  landlordLeft: {},
  landlordPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E0E0',
  },
  landlordPhotoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  landlordInfo: { flex: 1 },
  landlordNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  landlordName: { fontSize: 15, fontWeight: '700', color: TEXT_COLOR },
  landlordVerified: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landlordVerifiedText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  landlordRating: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 2 },
  landlordMeta: { fontSize: 12, color: TEXT_SECONDARY },
  landlordChevron: { fontSize: 22, color: TEXT_SECONDARY },

  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  msgBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  msgBtnText: { color: PRIMARY, fontWeight: '700', fontSize: 15 },
  applyBtn: {
    flex: 1.5,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
