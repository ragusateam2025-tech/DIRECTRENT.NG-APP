# Directrent.ng Feature Specification — Part 2
## Property Management, Search & Applications

---

# 5. Property Listing Management

## 5.1 Create Property Listing

**Feature ID:** PROP-001  
**Feature Name:** Property Listing Creation  
**Assigned To:** `frontend-landlord`, `backend`

### User Stories

```
AS A verified landlord
I WANT TO create a property listing with photos and details
SO THAT tenants can find and apply for my property

AS A landlord
I WANT TO see market rate comparisons while setting my price
SO THAT I can price my property competitively

AS a landlord
I WANT TO save my listing as a draft
SO THAT I can complete it later
```

### Acceptance Criteria

```gherkin
Feature: Create Property Listing

  Scenario: Complete listing creation flow
    Given I am a verified landlord
    When I tap "Add Property" on the dashboard
    Then I should see a multi-step listing form
    
    When I complete Step 1 (Basic Info)
    And I select property type "2 Bedroom Flat"
    And I set bedrooms to 2 and bathrooms to 2
    Then I should proceed to Step 2 (Location)
    
    When I enter address "15 Herbert Macaulay Way, Yaba"
    And I confirm the map pin location
    Then I should proceed to Step 3 (Photos)
    
    When I upload 5 or more photos
    Then I should proceed to Step 4 (Pricing)
    
    When I set annual rent to ₦650,000
    And I see the market comparison showing average ₦680,000
    Then I should proceed to Step 5 (Amenities)
    
    When I select amenities and add house rules
    Then I should see a full preview of my listing
    
    When I tap "Publish"
    Then my listing should be created with status "active"
    And I should see a success message
    And the listing should appear in search results

  Scenario: Minimum photo requirement
    Given I am on Step 3 (Photos) of listing creation
    When I upload only 3 photos
    And I tap "Continue"
    Then I should see "Please upload at least 5 photos"
    And I should not be able to proceed

  Scenario: Save as draft
    Given I am creating a listing
    When I tap the back button or close
    Then I should be asked "Save as draft?"
    When I tap "Save Draft"
    Then my progress should be saved
    And I should see it in "My Properties" as a draft

  Scenario: Photo quality validation
    Given I am uploading photos
    When I select an image smaller than 800x600 pixels
    Then I should see "Image quality too low. Please use higher resolution photos."
    When I select an image larger than 15MB
    Then I should see "Image too large. Maximum size is 10MB."

  Scenario: Price recommendation
    Given I am on the pricing step
    And I have selected "2 Bedroom" in "Yaba"
    Then I should see market insights:
      | Metric | Value |
      | Area Average | ₦680,000/year |
      | Price Range | ₦500,000 - ₦900,000 |
      | Similar Listings | 45 |
    And I should see a recommendation based on my amenities
```

### Technical Specifications

#### 5.1.1 Listing Creation Form Schema

```typescript
// Schema: createListingSchema
// Location: packages/shared/types/property.types.ts

import { z } from 'zod';

export const createListingSchema = z.object({
  // Step 1: Basic Information
  basicInfo: z.object({
    title: z.string()
      .min(10, 'Title must be at least 10 characters')
      .max(100, 'Title must be under 100 characters'),
    propertyType: z.enum([
      'self_contained', 'mini_flat', 'one_bedroom', 'two_bedroom',
      'three_bedroom', 'duplex', 'bungalow', 'boys_quarters'
    ]),
    bedrooms: z.number().min(0).max(10),
    bathrooms: z.number().min(1).max(10),
    sizeSqm: z.number().min(10).max(2000).optional(),
    yearBuilt: z.number().min(1960).max(new Date().getFullYear()).optional(),
    furnishing: z.enum(['unfurnished', 'semi_furnished', 'fully_furnished'])
  }),
  
  // Step 2: Location
  location: z.object({
    address: z.string().min(10, 'Please enter a complete address'),
    area: z.string().min(2),
    lga: z.string().min(2),
    coordinates: z.object({
      latitude: z.number().min(6.3).max(6.7),  // Lagos bounds
      longitude: z.number().min(3.0).max(4.0)
    }),
    nearbyLandmarks: z.array(z.string()).max(5).optional()
  }),
  
  // Step 3: Photos
  media: z.object({
    photos: z.array(z.object({
      uri: z.string().url(),
      order: z.number(),
      isPrimary: z.boolean()
    })).min(5, 'Please upload at least 5 photos').max(20),
    virtualTourUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional()
  }),
  
  // Step 4: Pricing
  pricing: z.object({
    annualRent: z.number()
      .min(100000, 'Minimum rent is ₦100,000')
      .max(50000000, 'Maximum rent is ₦50,000,000'),
    cautionDepositYears: z.number().min(0.5).max(2).default(1),
    serviceCharge: z.number().min(0).default(0),
    agreementFee: z.number().min(0).default(0)
  }),
  
  // Step 5: Details & Amenities
  details: z.object({
    description: z.string()
      .min(50, 'Description must be at least 50 characters')
      .max(2000),
    amenities: z.array(z.string()).min(1, 'Select at least one amenity'),
    petPolicy: z.enum(['no_pets', 'small_pets', 'all_pets']).default('no_pets'),
    maxOccupants: z.number().min(1).max(10).default(4),
    customRules: z.array(z.string()).max(10).optional()
  })
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
```

#### 5.1.2 Multi-Step Form Component

```typescript
// Component: CreateListingWizard
// Location: apps/landlord/components/CreateListingWizard/

import React, { useState, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createListingSchema, CreateListingInput } from '@directrent/shared/types';

const STEPS = [
  { id: 'basic', title: 'Basic Info', component: BasicInfoStep },
  { id: 'location', title: 'Location', component: LocationStep },
  { id: 'photos', title: 'Photos', component: PhotosStep },
  { id: 'pricing', title: 'Pricing', component: PricingStep },
  { id: 'details', title: 'Details', component: DetailsStep },
  { id: 'preview', title: 'Preview', component: PreviewStep }
];

export function CreateListingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  
  const methods = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    mode: 'onChange',
    defaultValues: {
      basicInfo: { bedrooms: 1, bathrooms: 1, furnishing: 'unfurnished' },
      pricing: { cautionDepositYears: 1, serviceCharge: 0, agreementFee: 0 },
      details: { petPolicy: 'no_pets', maxOccupants: 4, amenities: [] }
    }
  });
  
  const { handleSubmit, trigger, getValues } = methods;
  
  const goToNextStep = useCallback(async () => {
    // Validate current step fields
    const stepFields = getStepFields(currentStep);
    const isValid = await trigger(stepFields);
    
    if (isValid) {
      // Auto-save draft
      await saveDraft(getValues());
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  }, [currentStep, trigger, getValues]);
  
  const goToPrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);
  
  const saveDraft = useCallback(async (data: Partial<CreateListingInput>) => {
    const saveDraftFn = functions().httpsCallable('saveListingDraft');
    const result = await saveDraftFn({ draftId, data });
    setDraftId(result.data.draftId);
  }, [draftId]);
  
  const publishListing = useCallback(async (data: CreateListingInput) => {
    const createListingFn = functions().httpsCallable('createListing');
    const result = await createListingFn({ ...data, draftId });
    
    if (result.data.success) {
      router.replace(`/property/${result.data.propertyId}`);
    }
  }, [draftId]);
  
  const CurrentStepComponent = STEPS[currentStep].component;
  
  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        {/* Progress indicator */}
        <StepIndicator 
          steps={STEPS.map(s => s.title)} 
          currentStep={currentStep} 
        />
        
        {/* Current step content */}
        <CurrentStepComponent 
          onNext={goToNextStep}
          onPrev={goToPrevStep}
          isFirstStep={currentStep === 0}
          isLastStep={currentStep === STEPS.length - 1}
        />
        
        {/* Navigation buttons */}
        <View style={styles.navigation}>
          {currentStep > 0 && (
            <Button variant="outline" onPress={goToPrevStep}>
              Previous
            </Button>
          )}
          
          {currentStep < STEPS.length - 1 ? (
            <Button onPress={goToNextStep}>
              Continue
            </Button>
          ) : (
            <Button onPress={handleSubmit(publishListing)}>
              Publish Listing
            </Button>
          )}
        </View>
      </View>
    </FormProvider>
  );
}
```

#### 5.1.3 Photo Upload Component

```typescript
// Component: PhotoUploader
// Location: apps/landlord/components/PhotoUploader/

import React, { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { DraggableFlatList } from 'react-native-draggable-flatlist';

interface Photo {
  id: string;
  uri: string;
  order: number;
  isPrimary: boolean;
  uploading: boolean;
  uploadProgress: number;
  error?: string;
}

const PHOTO_CONFIG = {
  minPhotos: 5,
  maxPhotos: 20,
  maxSizeMB: 10,
  minWidth: 800,
  minHeight: 600,
  outputWidth: 1920,
  outputHeight: 1440,
  quality: 0.85
};

export function PhotoUploader({ 
  value, 
  onChange, 
  error 
}: {
  value: Photo[];
  onChange: (photos: Photo[]) => void;
  error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  
  const pickImages = useCallback(async () => {
    const remaining = PHOTO_CONFIG.maxPhotos - value.length;
    if (remaining <= 0) {
      Alert.alert('Maximum photos reached', `You can upload up to ${PHOTO_CONFIG.maxPhotos} photos`);
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1
    });
    
    if (!result.canceled) {
      await processAndUploadImages(result.assets);
    }
  }, [value.length]);
  
  const processAndUploadImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setUploading(true);
    
    const newPhotos: Photo[] = [];
    
    for (const asset of assets) {
      // Validate dimensions
      if (asset.width < PHOTO_CONFIG.minWidth || asset.height < PHOTO_CONFIG.minHeight) {
        Alert.alert('Image too small', `Please use images at least ${PHOTO_CONFIG.minWidth}x${PHOTO_CONFIG.minHeight} pixels`);
        continue;
      }
      
      // Validate file size
      const fileSizeMB = asset.fileSize ? asset.fileSize / (1024 * 1024) : 0;
      if (fileSizeMB > PHOTO_CONFIG.maxSizeMB) {
        Alert.alert('Image too large', `Maximum file size is ${PHOTO_CONFIG.maxSizeMB}MB`);
        continue;
      }
      
      // Process image
      const processed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: PHOTO_CONFIG.outputWidth, height: PHOTO_CONFIG.outputHeight } }],
        { compress: PHOTO_CONFIG.quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      newPhotos.push({
        id: photoId,
        uri: processed.uri,
        order: value.length + newPhotos.length,
        isPrimary: value.length === 0 && newPhotos.length === 0,
        uploading: true,
        uploadProgress: 0
      });
    }
    
    onChange([...value, ...newPhotos]);
    setUploading(false);
  };
  
  const removePhoto = useCallback((photoId: string) => {
    const updated = value.filter(p => p.id !== photoId);
    // Reassign primary if needed
    if (updated.length > 0 && !updated.some(p => p.isPrimary)) {
      updated[0].isPrimary = true;
    }
    // Reorder
    updated.forEach((p, i) => { p.order = i; });
    onChange(updated);
  }, [value, onChange]);
  
  const setPrimaryPhoto = useCallback((photoId: string) => {
    const updated = value.map(p => ({
      ...p,
      isPrimary: p.id === photoId
    }));
    onChange(updated);
  }, [value, onChange]);
  
  const onDragEnd = useCallback(({ data }: { data: Photo[] }) => {
    const reordered = data.map((p, i) => ({ ...p, order: i }));
    onChange(reordered);
  }, [onChange]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Property Photos ({value.length}/{PHOTO_CONFIG.maxPhotos})
      </Text>
      <Text style={styles.hint}>
        Drag to reorder. First photo is the cover image.
      </Text>
      
      <DraggableFlatList
        data={value}
        renderItem={({ item, drag, isActive }) => (
          <PhotoItem
            photo={item}
            onRemove={() => removePhoto(item.id)}
            onSetPrimary={() => setPrimaryPhoto(item.id)}
            onLongPress={drag}
            isActive={isActive}
          />
        )}
        keyExtractor={item => item.id}
        onDragEnd={onDragEnd}
        numColumns={3}
      />
      
      {value.length < PHOTO_CONFIG.maxPhotos && (
        <TouchableOpacity style={styles.addButton} onPress={pickImages}>
          <Text style={styles.addButtonText}>+ Add Photos</Text>
        </TouchableOpacity>
      )}
      
      {value.length < PHOTO_CONFIG.minPhotos && (
        <Text style={styles.requirement}>
          Please add at least {PHOTO_CONFIG.minPhotos - value.length} more photos
        </Text>
      )}
      
      {error && <Text style={styles.error}>{error}</Text>}
      
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>📸 Photo Tips</Text>
        <Text style={styles.tip}>• Include all rooms (bedroom, bathroom, kitchen, living area)</Text>
        <Text style={styles.tip}>• Show exterior and compound</Text>
        <Text style={styles.tip}>• Use natural lighting</Text>
        <Text style={styles.tip}>• Clean and declutter before shooting</Text>
      </View>
    </View>
  );
}
```

#### 5.1.4 Market Price Comparison

```typescript
// Component: PriceComparison
// Location: apps/landlord/components/PriceComparison/

interface MarketData {
  areaAverage: number;
  priceRange: { min: number; max: number };
  similarListings: number;
  recommendation: string;
  percentile: number;
}

export function PriceComparison({
  propertyType,
  bedrooms,
  area,
  amenities,
  currentPrice
}: {
  propertyType: string;
  bedrooms: number;
  area: string;
  amenities: string[];
  currentPrice: number;
}) {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchMarketData();
  }, [propertyType, bedrooms, area, amenities]);
  
  const fetchMarketData = async () => {
    setLoading(true);
    const getMarketRate = functions().httpsCallable('getMarketRate');
    const result = await getMarketRate({ propertyType, bedrooms, area, amenities });
    setMarketData(result.data);
    setLoading(false);
  };
  
  const pricePosition = useMemo(() => {
    if (!marketData || !currentPrice) return 'unknown';
    if (currentPrice < marketData.priceRange.min) return 'below';
    if (currentPrice > marketData.priceRange.max) return 'above';
    if (currentPrice < marketData.areaAverage * 0.9) return 'competitive';
    if (currentPrice > marketData.areaAverage * 1.1) return 'premium';
    return 'market';
  }, [marketData, currentPrice]);
  
  if (loading) return <ActivityIndicator />;
  if (!marketData) return null;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Market Insights for {area}</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatCurrency(marketData.areaAverage)}</Text>
          <Text style={styles.statLabel}>Area Average</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {formatCurrency(marketData.priceRange.min)} - {formatCurrency(marketData.priceRange.max)}
          </Text>
          <Text style={styles.statLabel}>Price Range</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{marketData.similarListings}</Text>
          <Text style={styles.statLabel}>Similar Listings</Text>
        </View>
      </View>
      
      {/* Price position indicator */}
      <View style={styles.priceBar}>
        <View style={styles.priceBarTrack}>
          <View style={[styles.priceMarker, { left: `${marketData.percentile}%` }]} />
        </View>
        <View style={styles.priceLabels}>
          <Text>{formatCurrency(marketData.priceRange.min)}</Text>
          <Text>{formatCurrency(marketData.priceRange.max)}</Text>
        </View>
      </View>
      
      {/* Recommendation */}
      <View style={[styles.recommendation, styles[`recommendation_${pricePosition}`]]}>
        <Text style={styles.recommendationText}>
          {pricePosition === 'competitive' && '💰 Great competitive price! Expect high interest.'}
          {pricePosition === 'market' && '✓ Price is in line with market average.'}
          {pricePosition === 'premium' && '📈 Premium pricing. Highlight unique features.'}
          {pricePosition === 'below' && '⚠️ Below typical range. Consider if this is intentional.'}
          {pricePosition === 'above' && '⚠️ Above typical range. May take longer to rent.'}
        </Text>
      </View>
    </View>
  );
}
```

#### 5.1.5 Cloud Function: createListing

```typescript
// Function: createListing
// Type: HTTPS Callable
// Location: firebase/functions/src/properties/createListing.ts

export const createListing = functions.https.onCall(async (data, context) => {
  // Validate authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const uid = context.auth.uid;
  
  // Verify landlord status and verification
  const landlordDoc = await firestore().collection('landlords').doc(uid).get();
  if (!landlordDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Only landlords can create listings');
  }
  
  const landlord = landlordDoc.data();
  if (landlord.ownershipVerification.status !== 'verified') {
    throw new functions.https.HttpsError('failed-precondition', 'Please complete property ownership verification first');
  }
  
  // Check listing limit
  const activeListings = await firestore()
    .collection('properties')
    .where('landlordId', '==', uid)
    .where('status.listing', 'in', ['active', 'paused'])
    .count()
    .get();
  
  if (activeListings.data().count >= landlord.subscription.features.maxListings) {
    throw new functions.https.HttpsError('resource-exhausted', 'Listing limit reached. Upgrade your plan to add more properties.');
  }
  
  // Validate input
  const validated = createListingSchema.parse(data);
  
  // Calculate pricing breakdown
  const pricing = {
    annualRent: validated.pricing.annualRent,
    cautionDeposit: validated.pricing.annualRent * validated.pricing.cautionDepositYears,
    serviceCharge: validated.pricing.serviceCharge,
    agreementFee: validated.pricing.agreementFee,
    platformFee: Math.round(validated.pricing.annualRent * 0.02),
    totalUpfront: 0,
    agentSavings: Math.round(validated.pricing.annualRent * 0.10)
  };
  pricing.totalUpfront = pricing.annualRent + pricing.cautionDeposit + 
                         pricing.serviceCharge + pricing.platformFee;
  
  // Generate geohash for location queries
  const geohash = generateGeohash(
    validated.location.coordinates.latitude,
    validated.location.coordinates.longitude
  );
  
  // Upload photos to permanent storage
  const uploadedPhotos = await Promise.all(
    validated.media.photos.map(async (photo, index) => {
      const photoUrl = await uploadPropertyPhoto(uid, photo.uri, index);
      return {
        url: photoUrl,
        thumbnail: await generateThumbnail(photoUrl),
        order: photo.order,
        isPrimary: photo.isPrimary,
        caption: null
      };
    })
  );
  
  // Create property document
  const propertyRef = firestore().collection('properties').doc();
  const propertyData = {
    id: propertyRef.id,
    landlordId: uid,
    
    title: validated.basicInfo.title,
    description: validated.details.description,
    propertyType: validated.basicInfo.propertyType,
    
    details: {
      bedrooms: validated.basicInfo.bedrooms,
      bathrooms: validated.basicInfo.bathrooms,
      sizeSqm: validated.basicInfo.sizeSqm || null,
      yearBuilt: validated.basicInfo.yearBuilt || null,
      furnishing: validated.basicInfo.furnishing
    },
    
    location: {
      address: validated.location.address,
      area: validated.location.area,
      lga: validated.location.lga,
      state: 'Lagos',
      coordinates: validated.location.coordinates,
      geohash,
      nearbyLandmarks: validated.location.nearbyLandmarks || []
    },
    
    pricing,
    
    media: {
      photos: uploadedPhotos,
      virtualTourUrl: validated.media.virtualTourUrl || null,
      videoUrl: validated.media.videoUrl || null
    },
    
    amenities: validated.details.amenities,
    
    rules: {
      petPolicy: validated.details.petPolicy,
      maxOccupants: validated.details.maxOccupants,
      customRules: validated.details.customRules || []
    },
    
    status: {
      listing: 'active',
      availability: 'available',
      featured: false,
      verified: false,  // Admin verification pending
      verifiedAt: null
    },
    
    analytics: {
      viewCount: 0,
      savedCount: 0,
      inquiryCount: 0,
      applicationCount: 0,
      lastViewedAt: null
    },
    
    currentTenant: null,
    
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    publishedAt: Timestamp.now()
  };
  
  // Execute batch write
  const batch = firestore().batch();
  
  batch.set(propertyRef, propertyData);
  
  // Update landlord portfolio
  batch.update(firestore().collection('landlords').doc(uid), {
    'portfolio.totalProperties': FieldValue.increment(1),
    'portfolio.activeListings': FieldValue.increment(1),
    'portfolio.totalValue': FieldValue.increment(pricing.annualRent),
    updatedAt: Timestamp.now()
  });
  
  // Delete draft if exists
  if (data.draftId) {
    batch.delete(firestore().collection('listingDrafts').doc(data.draftId));
  }
  
  await batch.commit();
  
  // Send notification
  await sendPushNotification(uid, {
    title: 'Listing Published! 🎉',
    body: `Your property "${validated.basicInfo.title}" is now live.`,
    data: { propertyId: propertyRef.id, action: 'view_property' }
  });
  
  // Track analytics
  await analytics.logEvent('listing_created', {
    propertyId: propertyRef.id,
    propertyType: validated.basicInfo.propertyType,
    area: validated.location.area,
    annualRent: pricing.annualRent
  });
  
  return {
    success: true,
    propertyId: propertyRef.id
  };
});
```

---

# 6. Property Search & Discovery

## 6.1 Property Search

**Feature ID:** SEARCH-001  
**Feature Name:** Property Search with Filters  
**Assigned To:** `frontend-tenant`, `backend`

### User Stories

```
AS A tenant
I WANT TO search for properties by location, price, and amenities
SO THAT I can find apartments that match my needs

AS A tenant
I WANT TO see search results on a map
SO THAT I can understand property locations

AS A tenant
I WANT TO save my search filters
SO THAT I can quickly repeat searches

AS A tenant  
I WANT TO receive alerts for new properties matching my criteria
SO THAT I don't miss opportunities
```

### Acceptance Criteria

```gherkin
Feature: Property Search

  Scenario: Basic location search
    Given I am on the search screen
    When I type "Yaba" in the search bar
    Then I should see autocomplete suggestions for Yaba areas
    When I select "Yaba, Lagos"
    Then I should see properties in Yaba
    And the results should show count "48 apartments found"

  Scenario: Filter by price range
    Given I have searched for properties in Yaba
    When I tap the "Price" filter
    And I set minimum to ₦500,000 and maximum to ₦800,000
    And I tap "Apply"
    Then results should only show properties within ₦500,000 - ₦800,000/year
    And the filter chip should show "₦500K - ₦800K"

  Scenario: Filter by multiple criteria
    Given I have searched for properties
    When I apply the following filters:
      | Filter | Value |
      | Bedrooms | 2 |
      | Amenities | 24hr Electricity, Security |
      | Verified Only | Yes |
    Then results should match all criteria
    And I should see active filter chips for each

  Scenario: Sort results
    Given I have search results
    When I tap "Sort" and select "Price: Low to High"
    Then results should be ordered by price ascending
    
  Scenario: Map view
    Given I have search results
    When I tap the map icon
    Then I should see a map with property pins
    And tapping a pin should show a property preview card
    And tapping the card should open property details

  Scenario: No results found
    Given I search for properties with very narrow criteria
    When no properties match
    Then I should see "No properties found"
    And I should see suggestions to broaden my search
    
  Scenario: Save search
    Given I have applied search filters
    When I tap "Save Search"
    And I name it "2BR in Yaba under 700K"
    Then the search should be saved
    And I should see it in my saved searches

  Scenario: New listing alert
    Given I have a saved search for "2BR in Yaba"
    When a new matching property is listed
    Then I should receive a push notification
    And the notification should link to the property
```

### Technical Specifications

#### 6.1.1 Search Query Builder

```typescript
// Service: search.service.ts
// Location: packages/shared/services/

import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

interface SearchFilters {
  areas?: string[];
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number[];
  propertyTypes?: string[];
  amenities?: string[];
  verifiedOnly?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'distance';
  coordinates?: { latitude: number; longitude: number };
  radiusKm?: number;
}

interface SearchResult {
  properties: Property[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export const SearchService = {
  /**
   * Search properties with filters
   */
  searchProperties: async (
    filters: SearchFilters,
    limit: number = 20,
    cursor?: string
  ): Promise<SearchResult> => {
    let query: FirebaseFirestoreTypes.Query = firestore()
      .collection('properties')
      .where('status.listing', '==', 'active')
      .where('status.availability', '==', 'available');
    
    // Area filter
    if (filters.areas && filters.areas.length > 0) {
      query = query.where('location.area', 'in', filters.areas.slice(0, 10));
    }
    
    // Price range filter
    if (filters.minPrice) {
      query = query.where('pricing.annualRent', '>=', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.where('pricing.annualRent', '<=', filters.maxPrice);
    }
    
    // Bedroom filter (Firestore limitation: can't combine with price range)
    // Handle client-side or use composite index
    
    // Verified only
    if (filters.verifiedOnly) {
      query = query.where('status.verified', '==', true);
    }
    
    // Sorting
    switch (filters.sortBy) {
      case 'price_asc':
        query = query.orderBy('pricing.annualRent', 'asc');
        break;
      case 'price_desc':
        query = query.orderBy('pricing.annualRent', 'desc');
        break;
      case 'newest':
        query = query.orderBy('publishedAt', 'desc');
        break;
      case 'rating':
        query = query.orderBy('rating', 'desc');
        break;
      default:
        query = query.orderBy('publishedAt', 'desc');
    }
    
    // Pagination
    if (cursor) {
      const cursorDoc = await firestore().collection('properties').doc(cursor).get();
      query = query.startAfter(cursorDoc);
    }
    
    query = query.limit(limit + 1);
    
    const snapshot = await query.get();
    const docs = snapshot.docs;
    
    // Check if there are more results
    const hasMore = docs.length > limit;
    const properties = docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Property));
    
    // Client-side filtering for fields that can't be combined in Firestore
    let filtered = properties;
    
    if (filters.bedrooms && filters.bedrooms.length > 0) {
      filtered = filtered.filter(p => filters.bedrooms!.includes(p.details.bedrooms));
    }
    
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      filtered = filtered.filter(p => filters.propertyTypes!.includes(p.propertyType));
    }
    
    if (filters.amenities && filters.amenities.length > 0) {
      filtered = filtered.filter(p => 
        filters.amenities!.every(a => p.amenities.includes(a))
      );
    }
    
    return {
      properties: filtered,
      total: filtered.length,
      hasMore,
      nextCursor: hasMore ? docs[limit - 1].id : undefined
    };
  },
  
  /**
   * Geo-based search (properties near a location)
   */
  searchNearby: async (
    center: { latitude: number; longitude: number },
    radiusKm: number,
    filters: Omit<SearchFilters, 'coordinates' | 'radiusKm'>
  ): Promise<Property[]> => {
    // Generate geohash bounds for the query
    const bounds = geohashQueryBounds([center.latitude, center.longitude], radiusKm * 1000);
    
    const promises = bounds.map(([start, end]) => {
      return firestore()
        .collection('properties')
        .where('status.listing', '==', 'active')
        .where('location.geohash', '>=', start)
        .where('location.geohash', '<=', end)
        .get();
    });
    
    const snapshots = await Promise.all(promises);
    
    // Merge and deduplicate results
    const seenIds = new Set<string>();
    const properties: Property[] = [];
    
    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          const data = doc.data() as Property;
          
          // Calculate actual distance
          const distance = distanceBetween(
            [center.latitude, center.longitude],
            [data.location.coordinates.latitude, data.location.coordinates.longitude]
          );
          
          // Filter by actual radius (geohash is approximate)
          if (distance <= radiusKm) {
            properties.push({
              ...data,
              distance: Math.round(distance * 10) / 10  // Round to 1 decimal
            });
          }
        }
      }
    }
    
    // Sort by distance
    return properties.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }
};
```

#### 6.1.2 Search Screen Component

```typescript
// Screen: SearchScreen
// Location: apps/tenant/app/(tabs)/search.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchService } from '@directrent/shared/services';
import { PropertyCard, SearchBar, FilterChips, MapView } from '@directrent/shared/components';
import { FilterModal } from '../components/FilterModal';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['properties', filters],
    queryFn: ({ pageParam }) => SearchService.searchProperties(filters, 20, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000  // 5 minutes
  });
  
  const properties = useMemo(() => {
    return data?.pages.flatMap(page => page.properties) ?? [];
  }, [data]);
  
  const totalCount = data?.pages[0]?.total ?? 0;
  
  const handleAreaSelect = useCallback((area: string) => {
    setFilters(prev => ({
      ...prev,
      areas: prev.areas?.includes(area) 
        ? prev.areas.filter(a => a !== area)
        : [...(prev.areas || []), area]
    }));
  }, []);
  
  const handleApplyFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
  }, []);
  
  const handleClearFilter = useCallback((filterKey: keyof SearchFilters) => {
    setFilters(prev => {
      const updated = { ...prev };
      delete updated[filterKey];
      return updated;
    });
  }, []);
  
  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).filter(key => {
      const value = filters[key as keyof SearchFilters];
      return value !== undefined && value !== null && 
             (Array.isArray(value) ? value.length > 0 : true);
    }).length;
  }, [filters]);
  
  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmit={() => {/* Handle search */}}
        placeholder="Search for apartments in Lagos..."
      />
      
      {/* Quick Area Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFilters}>
        {['Yaba', 'Ikeja', 'Lekki', 'Surulere', 'Ajah'].map(area => (
          <FilterChip
            key={area}
            label={area}
            selected={filters.areas?.includes(area)}
            onPress={() => handleAreaSelect(area)}
          />
        ))}
        <FilterChip
          label={`Filters ${activeFilterCount > 0 ? `(${activeFilterCount})` : ''}`}
          icon="filter"
          onPress={() => setShowFilters(true)}
        />
      </ScrollView>
      
      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <FilterChips
          filters={filters}
          onRemove={handleClearFilter}
          onClearAll={() => setFilters({})}
        />
      )}
      
      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultCount}>
          {totalCount} {totalCount === 1 ? 'apartment' : 'apartments'} found
        </Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity onPress={() => setViewMode('list')}>
            <Icon name="list" color={viewMode === 'list' ? colors.primary.main : colors.neutral.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('map')}>
            <Icon name="map" color={viewMode === 'map' ? colors.primary.main : colors.neutral.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Results */}
      {viewMode === 'list' ? (
        <FlatList
          data={properties}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              variant="full"
              onPress={() => router.push(`/property/${item.id}`)}
              onSave={() => handleSaveProperty(item.id)}
              isSaved={savedProperties.includes(item.id)}
            />
          )}
          keyExtractor={item => item.id}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
          ListEmptyComponent={<EmptySearchResults filters={filters} />}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      ) : (
        <MapView
          properties={properties}
          onPropertyPress={(id) => router.push(`/property/${id}`)}
          initialRegion={LAGOS_CENTER}
        />
      )}
      
      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setShowFilters(false)}
      />
    </View>
  );
}
```

#### 6.1.3 Filter Modal Component

```typescript
// Component: FilterModal
// Location: apps/tenant/components/FilterModal/

interface FilterModalProps {
  visible: boolean;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
}

export function FilterModal({ visible, filters, onApply, onClose }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);
  
  const handleReset = () => {
    setLocalFilters({});
  };
  
  const handleApply = () => {
    onApply(localFilters);
  };
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {/* Price Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Range (per year)</Text>
            <PriceRangeSlider
              min={100000}
              max={10000000}
              step={50000}
              values={[localFilters.minPrice || 100000, localFilters.maxPrice || 10000000]}
              onValuesChange={([min, max]) => setLocalFilters(prev => ({
                ...prev,
                minPrice: min,
                maxPrice: max
              }))}
            />
            <View style={styles.pricePresets}>
              {[
                { label: 'Under ₦500K', min: 0, max: 500000 },
                { label: '₦500K - ₦1M', min: 500000, max: 1000000 },
                { label: '₦1M - ₦2M', min: 1000000, max: 2000000 },
                { label: 'Above ₦2M', min: 2000000, max: 10000000 }
              ].map(preset => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  selected={localFilters.minPrice === preset.min && localFilters.maxPrice === preset.max}
                  onPress={() => setLocalFilters(prev => ({
                    ...prev,
                    minPrice: preset.min,
                    maxPrice: preset.max
                  }))}
                />
              ))}
            </View>
          </View>
          
          {/* Bedrooms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bedrooms</Text>
            <View style={styles.chipGrid}>
              {[
                { label: 'Self Contained', value: 0 },
                { label: '1 Bedroom', value: 1 },
                { label: '2 Bedrooms', value: 2 },
                { label: '3 Bedrooms', value: 3 },
                { label: '4+ Bedrooms', value: 4 }
              ].map(option => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={localFilters.bedrooms?.includes(option.value)}
                  onPress={() => toggleArrayFilter('bedrooms', option.value)}
                />
              ))}
            </View>
          </View>
          
          {/* Property Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Type</Text>
            <View style={styles.chipGrid}>
              {PROPERTY_TYPES.map(type => (
                <Chip
                  key={type.id}
                  label={type.label}
                  selected={localFilters.propertyTypes?.includes(type.id)}
                  onPress={() => toggleArrayFilter('propertyTypes', type.id)}
                />
              ))}
            </View>
          </View>
          
          {/* Amenities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.chipGrid}>
              {AMENITIES.map(amenity => (
                <Chip
                  key={amenity.id}
                  label={`${amenity.icon} ${amenity.label}`}
                  selected={localFilters.amenities?.includes(amenity.id)}
                  onPress={() => toggleArrayFilter('amenities', amenity.id)}
                />
              ))}
            </View>
          </View>
          
          {/* Verified Only */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Verified Landlords Only</Text>
                <Text style={styles.switchDescription}>
                  Show only properties from verified landlords
                </Text>
              </View>
              <Switch
                value={localFilters.verifiedOnly ?? false}
                onValueChange={(value) => setLocalFilters(prev => ({
                  ...prev,
                  verifiedOnly: value
                }))}
              />
            </View>
          </View>
          
          {/* Sort By */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            {[
              { label: 'Newest First', value: 'newest' },
              { label: 'Price: Low to High', value: 'price_asc' },
              { label: 'Price: High to Low', value: 'price_desc' },
              { label: 'Rating', value: 'rating' }
            ].map(option => (
              <RadioButton
                key={option.value}
                label={option.label}
                selected={localFilters.sortBy === option.value}
                onPress={() => setLocalFilters(prev => ({ ...prev, sortBy: option.value }))}
              />
            ))}
          </View>
        </ScrollView>
        
        {/* Apply Button */}
        <View style={styles.footer}>
          <Button variant="primary" onPress={handleApply} fullWidth>
            Show Results
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
```

---

# 7. Application & Inquiry System

## 7.1 Rental Application

**Feature ID:** APP-001  
**Feature Name:** Tenant Rental Application Submission  
**Assigned To:** `frontend-tenant`, `frontend-landlord`, `backend`

### User Stories

```
AS A verified tenant
I WANT TO submit a rental application for a property
SO THAT the landlord can consider me as a tenant

AS A landlord
I WANT TO review tenant applications with verification status
SO THAT I can make informed decisions

AS a tenant
I WANT TO track the status of my applications
SO THAT I know where I stand
```

### Acceptance Criteria

```gherkin
Feature: Rental Application

  Scenario: Submit application (verified tenant)
    Given I am a verified tenant viewing a property
    When I tap "Apply Now"
    Then I should see the application form
    And my verified information should be pre-filled
    
    When I complete the application form:
      | Field | Value |
      | Move-in Date | April 1, 2026 |
      | Lease Duration | 1 year |
      | Occupants | 2 adults, 0 children |
      | Message | Brief introduction |
    And I tap "Submit Application"
    Then my application should be submitted
    And I should see confirmation with status "Pending"
    And the landlord should receive a notification

  Scenario: Application requires verification
    Given I am an unverified tenant
    When I tap "Apply Now" on a property
    Then I should see "Verification required to apply"
    And I should have option to "Verify Now" or "Cancel"

  Scenario: Landlord reviews application
    Given I am a landlord with pending applications
    When I view an application
    Then I should see:
      | Information |
      | Tenant name and photo |
      | Verification status (BVN/NIN) |
      | Tenant rating and reviews |
      | Employment information |
      | Proposed move-in date |
      | Message from tenant |
    And I should have options to "Accept", "Decline", or "Message"

  Scenario: Application acceptance flow
    Given I am a landlord viewing a tenant application
    When I tap "Accept"
    Then I should confirm acceptance
    And the tenant should be notified
    And a conversation should be created if not exists
    And the property status should change to "pending"

  Scenario: Application withdrawal
    Given I have a pending application
    When I tap "Withdraw Application"
    And I confirm withdrawal
    Then my application status should be "withdrawn"
    And the landlord should be notified
```

### Technical Specifications

#### 7.1.1 Application Data Model

```typescript
// Type: Application
// Location: packages/shared/types/application.types.ts

export interface Application {
  id: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  
  status: 'pending' | 'viewed' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  
  details: {
    preferredMoveIn: Date;
    leaseDuration: '1_year' | '2_years' | '3_years';
    occupants: {
      adults: number;
      children: number;
      pets: { hasPets: boolean; petType?: string };
    };
    message: string;
  };
  
  tenantSnapshot: {
    name: string;
    photoUrl: string;
    phone: string;        // Revealed only after acceptance
    email: string;        // Revealed only after acceptance
    verification: {
      bvn: boolean;
      nin: boolean;
      employment: boolean;
    };
    rating: { average: number; count: number };
    employmentInfo?: {
      status: string;
      employer?: string;
      role?: string;
      incomeRange?: string;
    };
  };
  
  documents: {
    governmentId: { type: string; url: string };
    employmentLetter?: { url: string };
    bankStatement?: { url: string; months: number };
  };
  
  timeline: Array<{
    action: 'submitted' | 'viewed' | 'messaged' | 'accepted' | 'rejected' | 'withdrawn';
    timestamp: Date;
    note?: string;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}
```

#### 7.1.2 Application Form Component

```typescript
// Component: ApplicationForm
// Location: apps/tenant/components/ApplicationForm/

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const applicationSchema = z.object({
  preferredMoveIn: z.date()
    .min(addDays(new Date(), 7), 'Move-in date must be at least 7 days from now'),
  leaseDuration: z.enum(['1_year', '2_years', '3_years']),
  occupants: z.object({
    adults: z.number().min(1, 'At least 1 adult required').max(10),
    children: z.number().min(0).max(10),
    pets: z.object({
      hasPets: z.boolean(),
      petType: z.string().optional()
    })
  }),
  message: z.string()
    .min(20, 'Please write at least 20 characters')
    .max(1000, 'Message too long')
});

export function ApplicationForm({ 
  property, 
  onSubmit,
  onCancel 
}: {
  property: Property;
  onSubmit: (data: ApplicationInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { user, tenantProfile, isVerified } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  
  const { control, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      preferredMoveIn: addDays(new Date(), 14),
      leaseDuration: '1_year',
      occupants: { adults: 1, children: 0, pets: { hasPets: false } },
      message: ''
    }
  });
  
  const hasPets = watch('occupants.pets.hasPets');
  
  if (!isVerified()) {
    return <VerificationRequired onVerify={() => router.push('/verification/bvn')} />;
  }
  
  const handleFormSubmit = async (data: ApplicationInput) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
      Alert.alert('Application Submitted', 'The landlord will review your application.');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Property Summary */}
      <PropertyMiniCard property={property} />
      
      {/* Your Profile Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Profile</Text>
        <View style={styles.profileCard}>
          <Image source={{ uri: user.photoUrl }} style={styles.profilePhoto} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.firstName} {user.lastName}</Text>
            <VerificationBadge 
              verified={tenantProfile.verification.bvn.status === 'verified'} 
              type="tenant" 
            />
            <Text style={styles.profileDetail}>
              {tenantProfile.employment.employer || 'Employment not specified'}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Move-in Date */}
      <View style={styles.section}>
        <Text style={styles.label}>Preferred Move-in Date</Text>
        <Controller
          control={control}
          name="preferredMoveIn"
          render={({ field: { onChange, value } }) => (
            <DatePicker
              value={value}
              onChange={onChange}
              minimumDate={addDays(new Date(), 7)}
              maximumDate={addMonths(new Date(), 3)}
            />
          )}
        />
        {errors.preferredMoveIn && (
          <Text style={styles.error}>{errors.preferredMoveIn.message}</Text>
        )}
      </View>
      
      {/* Lease Duration */}
      <View style={styles.section}>
        <Text style={styles.label}>Lease Duration</Text>
        <Controller
          control={control}
          name="leaseDuration"
          render={({ field: { onChange, value } }) => (
            <SegmentedControl
              values={['1 Year', '2 Years', '3 Years']}
              selectedIndex={['1_year', '2_years', '3_years'].indexOf(value)}
              onChange={(index) => onChange(['1_year', '2_years', '3_years'][index])}
            />
          )}
        />
      </View>
      
      {/* Occupants */}
      <View style={styles.section}>
        <Text style={styles.label}>Number of Occupants</Text>
        <View style={styles.occupantsRow}>
          <Controller
            control={control}
            name="occupants.adults"
            render={({ field: { onChange, value } }) => (
              <Stepper
                label="Adults"
                value={value}
                onValueChange={onChange}
                min={1}
                max={property.rules.maxOccupants}
              />
            )}
          />
          <Controller
            control={control}
            name="occupants.children"
            render={({ field: { onChange, value } }) => (
              <Stepper
                label="Children"
                value={value}
                onValueChange={onChange}
                min={0}
                max={property.rules.maxOccupants}
              />
            )}
          />
        </View>
      </View>
      
      {/* Pets */}
      {property.rules.petPolicy !== 'no_pets' && (
        <View style={styles.section}>
          <Controller
            control={control}
            name="occupants.pets.hasPets"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <Text>Do you have pets?</Text>
                <Switch value={value} onValueChange={onChange} />
              </View>
            )}
          />
          {hasPets && (
            <Controller
              control={control}
              name="occupants.pets.petType"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  placeholder="What type of pet? (e.g., Dog, Cat)"
                  value={value}
                  onChangeText={onChange}
                  style={styles.input}
                />
              )}
            />
          )}
        </View>
      )}
      
      {/* Message to Landlord */}
      <View style={styles.section}>
        <Text style={styles.label}>Message to Landlord</Text>
        <Text style={styles.hint}>
          Introduce yourself briefly. Why are you interested in this property?
        </Text>
        <Controller
          control={control}
          name="message"
          render={({ field: { onChange, value } }) => (
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="Hi, I'm interested in this property because..."
              value={value}
              onChangeText={onChange}
              style={styles.textarea}
              maxLength={1000}
            />
          )}
        />
        <Text style={styles.charCount}>{watch('message').length}/1000</Text>
        {errors.message && (
          <Text style={styles.error}>{errors.message.message}</Text>
        )}
      </View>
      
      {/* Cost Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cost Breakdown</Text>
        <PriceDisplay
          amount={property.pricing.totalUpfront}
          showBreakdown
          breakdown={{
            rent: property.pricing.annualRent,
            deposit: property.pricing.cautionDeposit,
            serviceCharge: property.pricing.serviceCharge,
            platformFee: property.pricing.platformFee
          }}
          showSavings
          savingsAmount={property.pricing.agentSavings}
        />
      </View>
      
      {/* Submit Button */}
      <View style={styles.footer}>
        <Button
          variant="outline"
          onPress={onCancel}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onPress={handleSubmit(handleFormSubmit)}
          loading={submitting}
          style={styles.submitButton}
        >
          Submit Application
        </Button>
      </View>
    </ScrollView>
  );
}
```

#### 7.1.3 Cloud Function: submitApplication

```typescript
// Function: submitApplication
// Type: HTTPS Callable
// Location: firebase/functions/src/applications/submitApplication.ts

export const submitApplication = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const tenantId = context.auth.uid;
  const { propertyId, details } = data;
  
  // Validate tenant is verified
  const userDoc = await firestore().collection('users').doc(tenantId).get();
  const user = userDoc.data();
  
  if (user.verification.bvn.status !== 'verified' && user.verification.nin.status !== 'verified') {
    throw new functions.https.HttpsError('failed-precondition', 'Identity verification required');
  }
  
  // Get property
  const propertyDoc = await firestore().collection('properties').doc(propertyId).get();
  if (!propertyDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Property not found');
  }
  
  const property = propertyDoc.data() as Property;
  
  // Check property is available
  if (property.status.availability !== 'available') {
    throw new functions.https.HttpsError('failed-precondition', 'Property is no longer available');
  }
  
  // Check for existing pending application
  const existingApp = await firestore()
    .collection('applications')
    .where('tenantId', '==', tenantId)
    .where('propertyId', '==', propertyId)
    .where('status', 'in', ['pending', 'viewed'])
    .get();
  
  if (!existingApp.empty) {
    throw new functions.https.HttpsError('already-exists', 'You already have a pending application for this property');
  }
  
  // Get tenant profile
  const tenantDoc = await firestore().collection('tenants').doc(tenantId).get();
  const tenantProfile = tenantDoc.data();
  
  // Create application
  const applicationRef = firestore().collection('applications').doc();
  const applicationData: Application = {
    id: applicationRef.id,
    propertyId,
    landlordId: property.landlordId,
    tenantId,
    
    status: 'pending',
    
    details: {
      preferredMoveIn: Timestamp.fromDate(new Date(details.preferredMoveIn)),
      leaseDuration: details.leaseDuration,
      occupants: details.occupants,
      message: details.message
    },
    
    tenantSnapshot: {
      name: `${user.firstName} ${user.lastName}`,
      photoUrl: user.photoUrl,
      phone: user.phone,
      email: user.email,
      verification: {
        bvn: user.verification.bvn.status === 'verified',
        nin: user.verification.nin.status === 'verified',
        employment: tenantProfile.employment.verificationStatus === 'verified'
      },
      rating: tenantProfile.rating,
      employmentInfo: tenantProfile.employment.status ? {
        status: tenantProfile.employment.status,
        employer: tenantProfile.employment.employer,
        role: tenantProfile.employment.role,
        incomeRange: tenantProfile.employment.monthlyIncome
      } : undefined
    },
    
    documents: {
      governmentId: tenantProfile.documents.governmentId
    },
    
    timeline: [{
      action: 'submitted',
      timestamp: Timestamp.now()
    }],
    
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(addDays(new Date(), 14))
  };
  
  // Execute batch
  const batch = firestore().batch();
  
  batch.set(applicationRef, applicationData);
  
  // Update property analytics
  batch.update(propertyDoc.ref, {
    'analytics.applicationCount': FieldValue.increment(1),
    updatedAt: Timestamp.now()
  });
  
  await batch.commit();
  
  // Send notification to landlord
  await sendPushNotification(property.landlordId, {
    title: 'New Application! 📝',
    body: `${user.firstName} ${user.lastName} applied for ${property.title}`,
    data: {
      type: 'NEW_APPLICATION',
      applicationId: applicationRef.id,
      propertyId,
      action: 'view_application'
    }
  });
  
  // Track analytics
  await analytics.logEvent('application_submitted', {
    applicationId: applicationRef.id,
    propertyId,
    area: property.location.area
  });
  
  return {
    success: true,
    applicationId: applicationRef.id
  };
});
```

---

*Continued in FEATURE_SPEC_PART3.md...*
