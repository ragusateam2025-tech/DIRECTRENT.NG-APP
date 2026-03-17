/**
 * Edit Property Screen
 * Pre-populates form with existing property data and saves updates to Firestore.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const ERROR_COLOR = '#D32F2F';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';

const CURRENT_YEAR = new Date().getFullYear();

// ─── Constants ─────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { id: 'self_contained', label: 'Self Contained' },
  { id: 'mini_flat', label: 'Mini Flat' },
  { id: 'one_bedroom', label: '1 Bedroom Flat' },
  { id: 'two_bedroom', label: '2 Bedroom Flat' },
  { id: 'three_bedroom', label: '3 Bedroom Flat' },
  { id: 'duplex', label: 'Duplex' },
  { id: 'bungalow', label: 'Bungalow' },
  { id: 'boys_quarters', label: 'Boys Quarters' },
] as const;

type PropertyTypeId = typeof PROPERTY_TYPES[number]['id'];

const FURNISHING_OPTIONS = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi-Furnished' },
  { value: 'fully_furnished', label: 'Fully Furnished' },
] as const;

type FurnishingValue = typeof FURNISHING_OPTIONS[number]['value'];

const LAGOS_AREAS = [
  { area: 'Yaba', lga: 'Yaba' },
  { area: 'Surulere', lga: 'Surulere' },
  { area: 'Ikeja', lga: 'Ikeja' },
  { area: 'Ojodu', lga: 'Ojodu' },
  { area: 'Magodo', lga: 'Kosofe' },
  { area: 'Gbagada', lga: 'Kosofe' },
  { area: 'Maryland', lga: 'Kosofe' },
  { area: 'Lekki', lga: 'Eti-Osa' },
  { area: 'Ajah', lga: 'Eti-Osa' },
  { area: 'Victoria Island', lga: 'Eti-Osa' },
  { area: 'Ikoyi', lga: 'Eti-Osa' },
] as const;

const AMENITIES_LIST = [
  '24hr Electricity (Estate Power)',
  'Prepaid Meter',
  'Borehole Water',
  'Security (Gateman)',
  'CCTV',
  'Parking Space',
  'Boys Quarters',
  'Generator Backup',
  'Tarred Road Access',
  'Street Lights',
  'Waste Disposal',
  'Proximity to BRT',
];

const PET_POLICIES = [
  { value: 'no_pets' as const, label: 'No Pets' },
  { value: 'small_pets' as const, label: 'Small Pets Allowed' },
  { value: 'all_pets' as const, label: 'All Pets Allowed' },
];

const CAUTION_DEPOSIT_OPTIONS = [
  { value: 0.5 as const, label: '6 Months' },
  { value: 1 as const, label: '1 Year' },
  { value: 2 as const, label: '2 Years' },
];

// ─── Form schema ───────────────────────────────────────────────────────────────

const editSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be 100 characters or less'),
  propertyType: z.enum(
    ['self_contained', 'mini_flat', 'one_bedroom', 'two_bedroom', 'three_bedroom', 'duplex', 'bungalow', 'boys_quarters'],
    { required_error: 'Please select a property type' }
  ),
  bedrooms: z.number().min(0).max(10),
  bathrooms: z.number().min(1, 'At least 1 bathroom required').max(10),
  sizeSqm: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 10 && Number(v) <= 1000), {
      message: 'Size must be between 10 and 1000 sqm',
    }),
  yearBuilt: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 1960 && Number(v) <= CURRENT_YEAR), {
      message: `Year built must be between 1960 and ${CURRENT_YEAR}`,
    }),
  furnishing: z.enum(['unfurnished', 'semi_furnished', 'fully_furnished'], {
    required_error: 'Please select furnishing status',
  }),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description must be 2000 characters or less'),
  address: z.string().min(10, 'Please enter a complete street address').max(200, 'Address is too long'),
  area: z.string().min(1, 'Please select an area in Lagos'),
  lga: z.string(),
  annualRent: z.number().min(100000, 'Minimum rent is ₦100,000').max(50000000, 'Maximum rent is ₦50,000,000'),
  cautionDepositMultiplier: z.union([z.literal(0.5), z.literal(1), z.literal(2)]),
  serviceCharge: z.number().min(0).optional(),
  agreementFee: z.number().min(0).optional(),
  amenities: z.array(z.string()),
  petPolicy: z.enum(['no_pets', 'small_pets', 'all_pets']),
  maxOccupants: z.number().min(1).max(20),
  isAvailable: z.boolean(),
});

type EditFormData = z.infer<typeof editSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCurrencyInput(text: string): number {
  const cleaned = text.replace(/[^0-9]/g, '');
  return cleaned === '' ? 0 : parseInt(cleaned, 10);
}

function formatCurrencyDisplay(value: number): string {
  if (value === 0) return '';
  return value.toLocaleString('en-NG');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={styles.requiredStar}> *</Text>}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

function Stepper({
  value,
  onDecrease,
  onIncrease,
  min,
  max,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  min: number;
  max: number;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
        onPress={onDecrease}
        disabled={value <= min}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
        onPress={onIncrease}
        disabled={value >= max}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [rentDisplay, setRentDisplay] = useState('');
  const [serviceChargeDisplay, setServiceChargeDisplay] = useState('');
  const [agreementFeeDisplay, setAgreementFeeDisplay] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: '',
      propertyType: 'one_bedroom',
      bedrooms: 1,
      bathrooms: 1,
      sizeSqm: '',
      yearBuilt: '',
      furnishing: 'unfurnished',
      description: '',
      address: '',
      area: '',
      lga: '',
      annualRent: 0,
      cautionDepositMultiplier: 1,
      serviceCharge: 0,
      agreementFee: 0,
      amenities: [],
      petPolicy: 'no_pets',
      maxOccupants: 2,
      isAvailable: true,
    },
  });

  const watchedArea = watch('area');
  const watchedBedrooms = watch('bedrooms');
  const watchedBathrooms = watch('bathrooms');
  const watchedMaxOccupants = watch('maxOccupants');
  const watchedCautionMultiplier = watch('cautionDepositMultiplier');
  const watchedAnnualRent = watch('annualRent');
  const watchedIsAvailable = watch('isAvailable');

  // Load existing property data
  useEffect(() => {
    if (!id || !uid) return;

    const fetchProperty = async () => {
      try {
        const doc = await firestore().collection('properties').doc(id).get();
        if (!doc.exists) {
          Alert.alert('Error', 'Property not found.', [{ text: 'OK', onPress: () => router.back() }]);
          return;
        }

        const data = doc.data() as Record<string, unknown>;

        // Ownership check
        if (typeof data.landlordId === 'string' && data.landlordId !== uid) {
          Alert.alert('Access Denied', 'You do not own this property.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }

        const rent = typeof data.annualRent === 'number' ? data.annualRent : 0;
        const svcCharge = typeof data.serviceCharge === 'number' ? data.serviceCharge : 0;
        const agrmtFee = typeof data.agreementFee === 'number' ? data.agreementFee : 0;
        const amenitiesArr: string[] =
          Array.isArray(data.amenities) ? (data.amenities as string[]) : [];

        setRentDisplay(formatCurrencyDisplay(rent));
        setServiceChargeDisplay(formatCurrencyDisplay(svcCharge));
        setAgreementFeeDisplay(formatCurrencyDisplay(agrmtFee));
        setSelectedAmenities(amenitiesArr);

        const cautionRaw = data.cautionDepositMultiplier;
        const cautionVal: 0.5 | 1 | 2 =
          cautionRaw === 0.5 ? 0.5 : cautionRaw === 2 ? 2 : 1;

        const petRaw = data.petPolicy;
        const petVal: 'no_pets' | 'small_pets' | 'all_pets' =
          petRaw === 'small_pets' ? 'small_pets' : petRaw === 'all_pets' ? 'all_pets' : 'no_pets';

        const furnishRaw = data.furnishing;
        const furnishVal: 'unfurnished' | 'semi_furnished' | 'fully_furnished' =
          furnishRaw === 'semi_furnished'
            ? 'semi_furnished'
            : furnishRaw === 'fully_furnished'
            ? 'fully_furnished'
            : 'unfurnished';

        const propTypeRaw = data.propertyType;
        const validTypes = [
          'self_contained', 'mini_flat', 'one_bedroom', 'two_bedroom',
          'three_bedroom', 'duplex', 'bungalow', 'boys_quarters',
        ];
        const propTypeVal: PropertyTypeId = validTypes.includes(propTypeRaw as string)
          ? (propTypeRaw as PropertyTypeId)
          : 'one_bedroom';

        const coordsRaw = data.coordinates as Record<string, number> | null | undefined;

        reset({
          title: typeof data.title === 'string' ? data.title : '',
          propertyType: propTypeVal,
          bedrooms: typeof data.bedrooms === 'number' ? data.bedrooms : 1,
          bathrooms: typeof data.bathrooms === 'number' ? data.bathrooms : 1,
          sizeSqm: typeof data.sizeSqm === 'number' ? String(data.sizeSqm) : '',
          yearBuilt: typeof data.yearBuilt === 'number' ? String(data.yearBuilt) : '',
          furnishing: furnishVal,
          description: typeof data.description === 'string' ? data.description : '',
          address: typeof data.address === 'string' ? data.address : '',
          area: typeof data.area === 'string' ? data.area : '',
          lga: typeof data.lga === 'string' ? data.lga : '',
          annualRent: rent,
          cautionDepositMultiplier: cautionVal,
          serviceCharge: svcCharge,
          agreementFee: agrmtFee,
          amenities: amenitiesArr,
          petPolicy: petVal,
          maxOccupants: typeof data.maxOccupants === 'number' ? data.maxOccupants : 2,
          isAvailable: typeof data.isAvailable === 'boolean' ? data.isAvailable : true,
          ...(coordsRaw ? { coordinates: { lat: coordsRaw.lat, lng: coordsRaw.lng } } : {}),
        });
      } catch {
        Alert.alert('Error', 'Failed to load property data. Please try again.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, uid, reset]);

  const toggleAmenity = useCallback(
    (amenity: string) => {
      setSelectedAmenities((prev) => {
        const next = prev.includes(amenity)
          ? prev.filter((a) => a !== amenity)
          : [...prev, amenity];
        setValue('amenities', next);
        return next;
      });
    },
    [setValue]
  );

  const onSubmit = useCallback(
    async (data: EditFormData) => {
      if (!id || !uid) return;
      setSaving(true);
      try {
        await firestore()
          .collection('properties')
          .doc(id)
          .update({
            title: data.title,
            propertyType: data.propertyType,
            bedrooms: data.bedrooms,
            bathrooms: data.bathrooms,
            sizeSqm: data.sizeSqm ? Number(data.sizeSqm) : null,
            yearBuilt: data.yearBuilt ? Number(data.yearBuilt) : null,
            furnishing: data.furnishing,
            description: data.description,
            address: data.address,
            area: data.area,
            lga: data.lga,
            annualRent: data.annualRent,
            cautionDepositMultiplier: data.cautionDepositMultiplier,
            serviceCharge: data.serviceCharge ?? 0,
            agreementFee: data.agreementFee ?? 0,
            amenities: data.amenities,
            petPolicy: data.petPolicy,
            maxOccupants: data.maxOccupants,
            isAvailable: data.isAvailable,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });

        Alert.alert('Saved', 'Your property has been updated successfully.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
      } catch {
        Alert.alert('Error', 'Failed to save changes. Please try again.');
      } finally {
        setSaving(false);
      }
    },
    [id, uid]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading property...</Text>
      </SafeAreaView>
    );
  }

  const cautionAmount = watchedAnnualRent * watchedCautionMultiplier;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Property</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Basic Information ────────────────────────────────────────── */}
          <SectionHeader title="Basic Information" />

          <FieldLabel label="Listing Title" required />
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={value}
                onChangeText={onChange}
                placeholder="e.g., Spacious 2 Bedroom Flat in Yaba"
                placeholderTextColor={TEXT_SECONDARY}
                maxLength={100}
              />
            )}
          />
          <FieldError message={errors.title?.message} />

          <FieldLabel label="Property Type" required />
          <Controller
            control={control}
            name="propertyType"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipGrid}>
                {PROPERTY_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt.id}
                    style={[styles.chip, value === pt.id && styles.chipSelected]}
                    onPress={() => onChange(pt.id)}
                  >
                    <Text style={[styles.chipText, value === pt.id && styles.chipTextSelected]}>
                      {pt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          <FieldError message={errors.propertyType?.message} />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <FieldLabel label="Bedrooms" required />
              <Stepper
                value={watchedBedrooms}
                onDecrease={() => setValue('bedrooms', Math.max(0, watchedBedrooms - 1))}
                onIncrease={() => setValue('bedrooms', Math.min(10, watchedBedrooms + 1))}
                min={0}
                max={10}
              />
              <FieldError message={errors.bedrooms?.message} />
            </View>
            <View style={styles.rowItem}>
              <FieldLabel label="Bathrooms" required />
              <Stepper
                value={watchedBathrooms}
                onDecrease={() => setValue('bathrooms', Math.max(1, watchedBathrooms - 1))}
                onIncrease={() => setValue('bathrooms', Math.min(10, watchedBathrooms + 1))}
                min={1}
                max={10}
              />
              <FieldError message={errors.bathrooms?.message} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <FieldLabel label="Size (sqm)" />
              <Controller
                control={control}
                name="sizeSqm"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, errors.sizeSqm && styles.inputError]}
                    value={value ?? ''}
                    onChangeText={onChange}
                    placeholder="e.g., 65"
                    placeholderTextColor={TEXT_SECONDARY}
                    keyboardType="numeric"
                  />
                )}
              />
              <FieldError message={errors.sizeSqm?.message} />
            </View>
            <View style={styles.rowItem}>
              <FieldLabel label="Year Built" />
              <Controller
                control={control}
                name="yearBuilt"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, errors.yearBuilt && styles.inputError]}
                    value={value ?? ''}
                    onChangeText={onChange}
                    placeholder={`e.g., 2018`}
                    placeholderTextColor={TEXT_SECONDARY}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                )}
              />
              <FieldError message={errors.yearBuilt?.message} />
            </View>
          </View>

          <FieldLabel label="Furnishing Status" required />
          <Controller
            control={control}
            name="furnishing"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipRow}>
                {FURNISHING_OPTIONS.map((fo) => (
                  <TouchableOpacity
                    key={fo.value}
                    style={[styles.chipWide, value === fo.value && styles.chipSelected]}
                    onPress={() => onChange(fo.value)}
                  >
                    <Text style={[styles.chipText, value === fo.value && styles.chipTextSelected]}>
                      {fo.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          <FieldError message={errors.furnishing?.message} />

          <FieldLabel label="Description" required />
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, styles.textarea, errors.description && styles.inputError]}
                value={value}
                onChangeText={onChange}
                placeholder="Describe your property — highlight key features, the neighbourhood, access to transport, etc."
                placeholderTextColor={TEXT_SECONDARY}
                multiline
                numberOfLines={5}
                maxLength={2000}
                textAlignVertical="top"
              />
            )}
          />
          <Text style={styles.charCount}>{watch('description').length}/2000</Text>
          <FieldError message={errors.description?.message} />

          {/* ── Location ─────────────────────────────────────────────────── */}
          <SectionHeader title="Location" />

          <FieldLabel label="Street Address" required />
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.address && styles.inputError]}
                value={value}
                onChangeText={onChange}
                placeholder="e.g., 14 Herbert Macaulay Way, Yaba"
                placeholderTextColor={TEXT_SECONDARY}
                maxLength={200}
              />
            )}
          />
          <FieldError message={errors.address?.message} />

          <FieldLabel label="Area" required />
          <Controller
            control={control}
            name="area"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipGrid}>
                {LAGOS_AREAS.map((la) => (
                  <TouchableOpacity
                    key={la.area}
                    style={[styles.chip, value === la.area && styles.chipSelected]}
                    onPress={() => {
                      onChange(la.area);
                      setValue('lga', la.lga);
                    }}
                  >
                    <Text style={[styles.chipText, value === la.area && styles.chipTextSelected]}>
                      {la.area}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          {watchedArea !== '' && (
            <Text style={styles.lgaDisplay}>
              LGA: {LAGOS_AREAS.find((la) => la.area === watchedArea)?.lga ?? ''}
            </Text>
          )}
          <FieldError message={errors.area?.message} />

          {/* ── Pricing ──────────────────────────────────────────────────── */}
          <SectionHeader title="Pricing" />

          <FieldLabel label="Annual Rent (₦)" required />
          <TextInput
            style={[styles.input, errors.annualRent && styles.inputError]}
            value={rentDisplay}
            onChangeText={(text) => {
              const num = parseCurrencyInput(text);
              setRentDisplay(formatCurrencyDisplay(num));
              setValue('annualRent', num, { shouldValidate: true });
            }}
            placeholder="e.g., 650,000"
            placeholderTextColor={TEXT_SECONDARY}
            keyboardType="numeric"
          />
          <FieldError message={errors.annualRent?.message} />

          <FieldLabel label="Caution Deposit" required />
          <Controller
            control={control}
            name="cautionDepositMultiplier"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipRow}>
                {CAUTION_DEPOSIT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chipWide, value === opt.value && styles.chipSelected]}
                    onPress={() => onChange(opt.value)}
                  >
                    <Text style={[styles.chipText, value === opt.value && styles.chipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          {watchedAnnualRent > 0 && (
            <Text style={styles.depositHint}>
              Caution deposit: ₦{(cautionAmount).toLocaleString('en-NG')}
            </Text>
          )}

          <FieldLabel label="Service Charge (₦/yr)" />
          <TextInput
            style={styles.input}
            value={serviceChargeDisplay}
            onChangeText={(text) => {
              const num = parseCurrencyInput(text);
              setServiceChargeDisplay(formatCurrencyDisplay(num));
              setValue('serviceCharge', num);
            }}
            placeholder="Optional — estate service charge"
            placeholderTextColor={TEXT_SECONDARY}
            keyboardType="numeric"
          />

          <FieldLabel label="Agreement Fee (₦)" />
          <TextInput
            style={styles.input}
            value={agreementFeeDisplay}
            onChangeText={(text) => {
              const num = parseCurrencyInput(text);
              setAgreementFeeDisplay(formatCurrencyDisplay(num));
              setValue('agreementFee', num);
            }}
            placeholder="Optional — one-time legal/agreement fee"
            placeholderTextColor={TEXT_SECONDARY}
            keyboardType="numeric"
          />

          {/* ── Amenities & Rules ─────────────────────────────────────────── */}
          <SectionHeader title="Amenities" />

          <View style={styles.amenitiesGrid}>
            {AMENITIES_LIST.map((amenity) => {
              const selected = selectedAmenities.includes(amenity);
              return (
                <TouchableOpacity
                  key={amenity}
                  style={[styles.amenityChip, selected && styles.amenityChipSelected]}
                  onPress={() => toggleAmenity(amenity)}
                >
                  <Text style={[styles.amenityText, selected && styles.amenityTextSelected]}>
                    {selected ? '✓ ' : ''}
                    {amenity}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SectionHeader title="Rules & Preferences" />

          <FieldLabel label="Pet Policy" required />
          <Controller
            control={control}
            name="petPolicy"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipRow}>
                {PET_POLICIES.map((pp) => (
                  <TouchableOpacity
                    key={pp.value}
                    style={[styles.chipWide, value === pp.value && styles.chipSelected]}
                    onPress={() => onChange(pp.value)}
                  >
                    <Text style={[styles.chipText, value === pp.value && styles.chipTextSelected]}>
                      {pp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />

          <FieldLabel label="Max Occupants" required />
          <Stepper
            value={watchedMaxOccupants}
            onDecrease={() => setValue('maxOccupants', Math.max(1, watchedMaxOccupants - 1))}
            onIncrease={() => setValue('maxOccupants', Math.min(20, watchedMaxOccupants + 1))}
            min={1}
            max={20}
          />
          <FieldError message={errors.maxOccupants?.message} />

          {/* ── Listing Status ────────────────────────────────────────────── */}
          <SectionHeader title="Listing Status" />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Property Available</Text>
              <Text style={styles.switchSubLabel}>
                {watchedIsAvailable
                  ? 'Listing is live and accepting inquiries'
                  : 'Listing is paused — hidden from search'}
              </Text>
            </View>
            <Controller
              control={control}
              name="isAvailable"
              render={({ field: { onChange, value } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: BORDER, true: PRIMARY_LIGHT }}
                  thumbColor={value ? PRIMARY : TEXT_SECONDARY}
                />
              )}
            />
          </View>

          {/* ── Save button ───────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  loadingText: { marginTop: 12, fontSize: 14, color: TEXT_SECONDARY },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnText: { fontSize: 22, fontWeight: '700', color: TEXT_COLOR },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_COLOR },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: TEXT_COLOR, marginBottom: 6, marginTop: 14 },
  requiredStar: { color: ERROR_COLOR },
  fieldError: { fontSize: 12, color: ERROR_COLOR, marginTop: 4 },

  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: TEXT_COLOR,
  },
  inputError: { borderColor: ERROR_COLOR },
  textarea: { minHeight: 110, paddingTop: 12 },
  charCount: { fontSize: 11, color: TEXT_SECONDARY, textAlign: 'right', marginTop: 4 },

  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  chipWide: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    alignItems: 'center',
  },
  chipSelected: { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  chipText: { fontSize: 13, color: TEXT_COLOR },
  chipTextSelected: { color: PRIMARY, fontWeight: '700' },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { borderColor: BORDER },
  stepperBtnText: { fontSize: 20, color: PRIMARY, fontWeight: '700', lineHeight: 24 },
  stepperValue: { fontSize: 18, fontWeight: '700', color: TEXT_COLOR, minWidth: 28, textAlign: 'center' },

  lgaDisplay: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 6 },
  depositHint: { fontSize: 12, color: PRIMARY, marginTop: 6, fontWeight: '600' },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  amenityChipSelected: { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  amenityText: { fontSize: 12, color: TEXT_COLOR },
  amenityTextSelected: { color: PRIMARY, fontWeight: '600' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 8,
  },
  switchInfo: { flex: 1 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: TEXT_COLOR },
  switchSubLabel: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },

  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnDisabled: { backgroundColor: '#A5D6A7' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  cancelBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelBtnText: { color: TEXT_SECONDARY, fontSize: 15, fontWeight: '600' },
});
