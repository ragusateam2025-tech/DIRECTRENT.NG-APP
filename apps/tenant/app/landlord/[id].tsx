import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { RootState } from '../../store';
import { PropertyService } from '../../../../packages/shared/src/services/property.service';
import { PropertyCard } from '../../../../packages/shared/src/components/PropertyCard';
import { EmptyState } from '../../../../packages/shared/src/components/EmptyState';
import type { Property } from '../../../../packages/shared/src/types/property';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';

interface LandlordProfile {
  uid: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  verified: boolean;
  createdAt: { toDate?: () => Date; seconds?: number } | null;
  rating: { average: number; count: number };
  portfolio: {
    totalProperties: number;
    activeListings: number;
    occupiedProperties: number;
  };
  responseMetrics?: {
    averageResponseTime: number;
    responseRate: number;
  };
  ownershipVerification?: { status: string };
}

interface Review {
  id: string;
  reviewerId: string;
  rating: { overall: number };
  content: { text: string };
  createdAt: { toDate?: () => Date; seconds?: number } | null;
  reviewerName?: string;
}

export default function LandlordProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const profile = useSelector((state: RootState) => state.auth.profile);

  const [landlord, setLandlord] = useState<LandlordProfile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const [userDoc, landlordDoc, reviewsSnap, propertiesResult] = await Promise.all([
          firestore().collection('users').doc(id as string).get(),
          firestore().collection('landlords').doc(id as string).get(),
          firestore()
            .collection('reviews')
            .where('revieweeId', '==', id)
            .where('type', '==', 'tenant_to_landlord')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get(),
          PropertyService.getPropertiesByLandlord(id as string),
        ]);

        if (userDoc.exists) {
          const userData = userDoc.data()!;
          const landlordData = landlordDoc.data() ?? {};
          setLandlord({
            uid: id as string,
            firstName: userData.firstName,
            lastName: userData.lastName,
            photoUrl: userData.photoUrl,
            verified:
              userData.verification?.bvn?.status === 'verified' ||
              userData.verification?.nin?.status === 'verified',
            createdAt: userData.createdAt,
            rating: landlordData.rating ?? { average: 0, count: 0 },
            portfolio: landlordData.portfolio ?? {
              totalProperties: 0,
              activeListings: 0,
              occupiedProperties: 0,
            },
            responseMetrics: landlordData.responseMetrics,
            ownershipVerification: landlordData.ownershipVerification,
          });
        }

        // Load active properties only
        const activeProps = propertiesResult.filter(
          p => p.status?.listing === 'active' && p.status?.availability === 'available'
        );
        setProperties(activeProps);

        // Load reviews with reviewer names
        const reviewsData = await Promise.all(
          reviewsSnap.docs.map(async doc => {
            const r = { id: doc.id, ...doc.data() } as Review;
            try {
              const reviewerDoc = await firestore()
                .collection('users')
                .doc(r.reviewerId)
                .get();
              if (reviewerDoc.exists) {
                const rd = reviewerDoc.data()!;
                r.reviewerName = `${rd.firstName} ${rd.lastName[0]}.`;
              }
            } catch {
              // skip
            }
            return r;
          })
        );
        setReviews(reviewsData);

        // Load saved IDs for the current tenant
        if (uid) {
          const tenantDoc = await firestore().collection('tenants').doc(uid).get();
          setSavedIds(tenantDoc.data()?.savedProperties ?? []);
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, uid]);

  const handleToggleSave = useCallback(
    async (propertyId: string) => {
      if (!uid) return;
      const next = !savedIds.includes(propertyId);
      setSavedIds(prev =>
        next ? [...prev, propertyId] : prev.filter(x => x !== propertyId)
      );
      try {
        if (next) {
          await PropertyService.saveProperty(uid, propertyId);
        } else {
          await PropertyService.unsaveProperty(uid, propertyId);
        }
      } catch {
        setSavedIds(prev =>
          !next ? [...prev, propertyId] : prev.filter(x => x !== propertyId)
        );
      }
    },
    [uid, savedIds]
  );

  const handleMessage = useCallback(async () => {
    const isVerified =
      profile?.verification?.bvn?.status === 'verified' ||
      profile?.verification?.nin?.status === 'verified';
    if (!isVerified) {
      Alert.alert(
        'Verification Required',
        'You need to verify your identity before messaging landlords.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: () => router.push('/(verification)/bvn') },
        ]
      );
      return;
    }

    const firstProperty = properties[0];
    if (!firstProperty) {
      Alert.alert(
        'No Active Listings',
        'This landlord has no active properties to message about.'
      );
      return;
    }

    try {
      const startConversation = functions().httpsCallable('startConversation');
      const result = await startConversation({ propertyId: firstProperty.id });
      const data = result.data as { conversationId: string };
      router.push(`/chat/${data.conversationId}`);
    } catch {
      Alert.alert('Error', 'Could not start conversation. Please try again.');
    }
  }, [profile, properties]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!landlord) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 40 }}>👤</Text>
          <Text style={styles.errorText}>Landlord not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const memberYear = landlord.createdAt?.toDate
    ? new Date(landlord.createdAt.toDate()).getFullYear()
    : null;

  const ratingStars = Array.from({ length: 5 }, (_, i) => {
    const full = Math.floor(landlord.rating.average);
    return i < full ? '★' : '☆';
  }).join('');

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.topBtn} onPress={() => router.back()}>
          <Text style={styles.topBtnIcon}>←</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero / Profile Header */}
        <View style={styles.heroSection}>
          {landlord.photoUrl ? (
            <Image source={{ uri: landlord.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={{ fontSize: 40 }}>👤</Text>
            </View>
          )}

          <Text style={styles.fullName}>
            {landlord.firstName} {landlord.lastName}
          </Text>

          {landlord.verified && (
            <View style={styles.verifiedRow}>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified Landlord</Text>
              </View>
            </View>
          )}

          {landlord.rating.count > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.stars}>{ratingStars}</Text>
              <Text style={styles.ratingScore}>
                {landlord.rating.average.toFixed(1)}
              </Text>
              <Text style={styles.ratingCount}>
                ({landlord.rating.count} review{landlord.rating.count !== 1 ? 's' : ''})
              </Text>
            </View>
          )}

          {memberYear && (
            <Text style={styles.memberSince}>Member since {memberYear}</Text>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{landlord.portfolio.totalProperties}</Text>
            <Text style={styles.statLabel}>Properties</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{landlord.portfolio.activeListings}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: SUCCESS }]}>
              {landlord.responseMetrics?.responseRate != null
                ? `${Math.round(landlord.responseMetrics.responseRate)}%`
                : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Response Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {landlord.responseMetrics?.averageResponseTime != null
                ? `${landlord.responseMetrics.averageResponseTime}h`
                : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Avg. Reply</Text>
          </View>
        </View>

        {/* Ownership Verification Badge */}
        {landlord.ownershipVerification?.status === 'verified' && (
          <View style={styles.ownershipBanner}>
            <Text style={styles.ownershipText}>
              📜 Property ownership documents verified
            </Text>
          </View>
        )}

        {/* Active Listings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Available Properties ({properties.length})
          </Text>

          {properties.length === 0 ? (
            <EmptyState
              icon="🏠"
              title="No active listings"
              message="This landlord has no available properties right now."
            />
          ) : (
            properties.map(p => (
              <PropertyCard
                key={p.id}
                property={p}
                variant="full"
                onPress={() => router.push(`/property/${p.id}`)}
                onSave={() => handleToggleSave(p.id)}
                isSaved={savedIds.includes(p.id)}
              />
            ))
          )}
        </View>

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Tenant Reviews ({reviews.length})
            </Text>

            {reviews.map(r => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewerName}>
                      {r.reviewerName ?? 'Anonymous'}
                    </Text>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Text
                          key={i}
                          style={[
                            styles.reviewStar,
                            i < r.rating.overall && styles.reviewStarFilled,
                          ]}
                        >
                          ★
                        </Text>
                      ))}
                    </View>
                  </View>
                  {r.createdAt?.toDate && (
                    <Text style={styles.reviewDate}>
                      {new Date(r.createdAt.toDate()).toLocaleDateString('en-NG', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
                <Text style={styles.reviewText}>{r.content.text}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action */}
      <SafeAreaView style={styles.actionBar} edges={['bottom']}>
        <TouchableOpacity
          style={styles.msgBtn}
          onPress={handleMessage}
          activeOpacity={0.85}
        >
          <Text style={styles.msgBtnText}>💬 Message Landlord</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 16, color: TEXT_SECONDARY, marginTop: 8 },
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

  heroSection: {
    backgroundColor: SURFACE,
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E0E0E0',
    marginBottom: 14,
  },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  fullName: { fontSize: 22, fontWeight: '800', color: TEXT_COLOR, marginBottom: 8 },
  verifiedRow: { marginBottom: 8 },
  verifiedBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  verifiedText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  stars: { fontSize: 16, color: '#FFB300', letterSpacing: 2 },
  ratingScore: { fontSize: 16, fontWeight: '700', color: TEXT_COLOR },
  ratingCount: { fontSize: 13, color: TEXT_SECONDARY },
  memberSince: { fontSize: 13, color: TEXT_SECONDARY },

  statsRow: {
    backgroundColor: SURFACE,
    flexDirection: 'row',
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: TEXT_COLOR },
  statLabel: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: BORDER, marginVertical: 4 },

  ownershipBanner: {
    backgroundColor: PRIMARY_LIGHT,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  ownershipText: { fontSize: 13, color: SUCCESS, fontWeight: '600' },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG,
  },

  reviewCard: {
    backgroundColor: SURFACE,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerName: { fontSize: 14, fontWeight: '700', color: TEXT_COLOR },
  reviewStars: { flexDirection: 'row', gap: 2, marginTop: 2 },
  reviewStar: { fontSize: 14, color: '#E0E0E0' },
  reviewStarFilled: { color: '#FFB300' },
  reviewDate: { fontSize: 12, color: TEXT_SECONDARY },
  reviewText: { fontSize: 14, color: TEXT_COLOR, lineHeight: 20 },

  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  msgBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  msgBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
