/**
 * Property Listing Wizard — Create Listing
 * 6-step wizard: Basic Info → Location → Photos → Pricing → Amenities → Review
 */
import React, { useState, useCallback, useRef } from 'react';
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
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MapView, { Marker, PROVIDER_GOOGLE, MapPressEvent } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const ERROR_COLOR = '#D32F2F';
const SURFACE = '#FAFAFA';
const BG = '#F5F7FA';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Constants from CLAUDE.md ──────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { id: 'self_contained', label: 'Self Contained', icon: '🛏️', description: 'Single room with private bathroom' },
  { id: 'mini_flat',      label: 'Mini Flat',      icon: '🏠', description: '1 bedroom studio apartment' },
  { id: 'one_bedroom',    label: '1 Bedroom Flat', icon: '🏢', description: 'Standard 1BR apartment' },
  { id: 'two_bedroom',    label: '2 Bedroom Flat', icon: '🏘️', description: 'Standard 2BR apartment' },
  { id: 'three_bedroom',  label: '3 Bedroom Flat', icon: '🏗️', description: 'Standard 3BR apartment' },
  { id: 'duplex',         label: 'Duplex',          icon: '🏛️', description: 'Multi-level house' },
  { id: 'bungalow',       label: 'Bungalow',        icon: '🏡', description: 'Single-story house' },
  { id: 'boys_quarters',  label: 'Boys Quarters',   icon: '🛖', description: 'Detached service apartment' },
] as const;

type PropertyTypeId = typeof PROPERTY_TYPES[number]['id'];

const FURNISHING_OPTIONS = [
  { value: 'unfurnished',     label: 'Unfurnished',     icon: '🪑', description: 'Empty property' },
  { value: 'semi_furnished',  label: 'Semi-Furnished',  icon: '🛋️', description: 'Some fittings included' },
  { value: 'fully_furnished', label: 'Fully Furnished', icon: '🏠', description: 'Move-in ready' },
] as const;

type FurnishingValue = typeof FURNISHING_OPTIONS[number]['value'];

const CURRENT_YEAR = new Date().getFullYear();

const LAGOS_AREAS = [
  { area: 'Yaba',              lga: 'Yaba',      lat: 6.5059, lng: 3.3713 },
  { area: 'Surulere',          lga: 'Surulere',  lat: 6.4969, lng: 3.3545 },
  { area: 'Ikeja',             lga: 'Ikeja',     lat: 6.6018, lng: 3.3515 },
  { area: 'Ojodu',             lga: 'Ojodu',     lat: 6.6363, lng: 3.3497 },
  { area: 'Magodo',            lga: 'Kosofe',    lat: 6.6007, lng: 3.3985 },
  { area: 'Gbagada',           lga: 'Kosofe',    lat: 6.5530, lng: 3.3850 },
  { area: 'Maryland',          lga: 'Kosofe',    lat: 6.5575, lng: 3.3500 },
  { area: 'Lekki',             lga: 'Eti-Osa',   lat: 6.4698, lng: 3.5852 },
  { area: 'Ajah',              lga: 'Eti-Osa',   lat: 6.4699, lng: 3.6144 },
  { area: 'Victoria Island',   lga: 'Eti-Osa',   lat: 6.4281, lng: 3.4219 },
  { area: 'Ikoyi',             lga: 'Eti-Osa',   lat: 6.4550, lng: 3.4341 },
] as const;

type LagosAreaEntry = typeof LAGOS_AREAS[number];

const LANDMARK_SUGGESTIONS = [
  'BRT Stop', 'Bus Stop', 'Market', 'Filling Station', 'School',
  'Hospital', 'Shopping Mall', 'Estate Gate', 'Church', 'Mosque',
  'Bank', 'Supermarket', 'Police Station', 'University',
];

const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };

const AMENITIES_LIST = [
  { label: '24hr Electricity (Estate Power)', emoji: '⚡' },
  { label: 'Prepaid Meter', emoji: '🔌' },
  { label: 'Borehole Water', emoji: '💧' },
  { label: 'Security (Gateman)', emoji: '💂' },
  { label: 'CCTV', emoji: '📹' },
  { label: 'Parking Space', emoji: '🅿️' },
  { label: 'Boys Quarters', emoji: '🏠' },
  { label: 'Generator Backup', emoji: '🔋' },
  { label: 'Tarred Road Access', emoji: '🛣️' },
  { label: 'Street Lights', emoji: '💡' },
  { label: 'Waste Disposal', emoji: '🗑️' },
  { label: 'Proximity to BRT', emoji: '🚌' },
];

const PET_POLICIES = [
  { value: 'no_pets' as const, label: 'No Pets', emoji: '🚫' },
  { value: 'small_pets' as const, label: 'Small Pets', emoji: '🐱' },
  { value: 'all_pets' as const, label: 'All Pets', emoji: '🐾' },
];

const SUGGESTED_RULES = [
  'No smoking',
  'No loud music after 10pm',
  'Visitors must sign in',
  'No subletting',
];

const RENT_RANGES = {
  mainland: { min: 300000, max: 2000000 },
  island: { min: 900000, max: 4000000 },
};

const ISLAND_AREAS = ['Lekki', 'Ajah', 'Victoria Island', 'Ikoyi'];

// ─── Wizard step data shapes ───────────────────────────────────────────────────

export type Step1Data = {
  title: string;
  propertyType: PropertyTypeId;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: string;
  yearBuilt: string;
  furnishing: FurnishingValue;
  description: string;
};

export type Step2Data = {
  address: string;
  area: string;
  lga: string;
  coordinates: { lat: number; lng: number };
  nearbyLandmarks: string[];
};

type PhotoEntry = {
  uri: string;
  storagePath: string;
  downloadUrl: string;
  uploading: boolean;
};

export type Step3Data = {
  photos: Array<{
    uri: string;
    storagePath: string;
    downloadUrl: string;
  }>;
  virtualTourUrl: string;
};

export type Step4Data = {
  annualRent: number;
  cautionDepositMultiplier: 0.5 | 1 | 2;
  serviceCharge: number;
  agreementFee: number;
};

export type Step5Data = {
  amenities: string[];
  petPolicy: 'no_pets' | 'small_pets' | 'all_pets';
  maxOccupants: number;
  rules: string[];
};

// ─── Zod schemas ───────────────────────────────────────────────────────────────

const step1Schema = z.object({
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
});

type Step1FormData = z.infer<typeof step1Schema>;

const step2Schema = z.object({
  address: z
    .string()
    .min(10, 'Please enter a complete street address')
    .max(200, 'Address is too long'),
  area: z.string().min(1, 'Please select an area in Lagos'),
  lga: z.string(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
  nearbyLandmarks: z.array(z.string()).max(5, 'Maximum 5 landmarks'),
});

type Step2FormData = z.infer<typeof step2Schema>;

const step4Schema = z.object({
  annualRent: z.number().min(100000, 'Minimum rent is ₦100,000').max(50000000, 'Maximum rent is ₦50,000,000'),
  cautionDepositMultiplier: z.union([z.literal(0.5), z.literal(1), z.literal(2)]),
  serviceCharge: z.number().min(0).optional(),
  agreementFee: z.number().min(0).optional(),
});

type Step4FormData = z.infer<typeof step4Schema>;

// ─── Currency helpers ──────────────────────────────────────────────────────────

function parseCurrencyInput(text: string): number {
  const cleaned = text.replace(/[^0-9]/g, '');
  return cleaned === '' ? 0 : parseInt(cleaned, 10);
}

function formatCurrencyDisplay(value: number): string {
  if (value === 0) return '';
  return value.toLocaleString('en-NG');
}

function formatNaira(value: number): string {
  if (value === 0) return '₦0';
  return '₦' + value.toLocaleString('en-NG');
}

// ─── Wizard step list ──────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: 'Basic Info' },
  { number: 2, label: 'Location' },
  { number: 3, label: 'Photos' },
  { number: 4, label: 'Pricing' },
  { number: 5, label: 'Amenities' },
  { number: 6, label: 'Review' },
];

// ─── Root component ────────────────────────────────────────────────────────────

export default function CreatePropertyScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [step3Data, setStep3Data] = useState<Step3Data | null>(null);
  const [step4Data, setStep4Data] = useState<Step4Data | null>(null);
  const [step5Data, setStep5Data] = useState<Step5Data | null>(null);

  const handleStep1Complete = (data: Step1Data) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: Step2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const handleStep3Complete = (data: Step3Data) => {
    setStep3Data(data);
    setCurrentStep(4);
  };

  const handleStep4Complete = (data: Step4Data) => {
    setStep4Data(data);
    setCurrentStep(5);
  };

  const handleStep5Complete = (data: Step5Data) => {
    setStep5Data(data);
    setCurrentStep(6);
  };

  const handleExit = () => {
    Alert.alert(
      'Exit listing?',
      'Your progress will be lost if you exit now.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WizardHeader
        currentStep={currentStep}
        totalSteps={STEPS.length}
        onExit={handleExit}
      />

      {currentStep === 1 && (
        <Step1BasicInfo
          initialData={step1Data}
          onNext={handleStep1Complete}
        />
      )}
      {currentStep === 2 && (
        <Step2Location
          initialData={step2Data}
          onNext={handleStep2Complete}
          onBack={() => setCurrentStep(1)}
        />
      )}
      {currentStep === 3 && (
        <Step3Photos
          initialData={step3Data}
          onNext={handleStep3Complete}
          onBack={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 4 && (
        <Step4Pricing
          initialData={step4Data}
          area={step2Data?.area ?? ''}
          onNext={handleStep4Complete}
          onBack={() => setCurrentStep(3)}
        />
      )}
      {currentStep === 5 && (
        <Step5Amenities
          initialData={step5Data}
          onNext={handleStep5Complete}
          onBack={() => setCurrentStep(4)}
        />
      )}
      {currentStep === 6 && step1Data && step2Data && step3Data && step4Data && step5Data && (
        <Step6Review
          step1Data={step1Data}
          step2Data={step2Data}
          step3Data={step3Data}
          step4Data={step4Data}
          step5Data={step5Data}
          onBack={() => setCurrentStep(5)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Wizard Header ─────────────────────────────────────────────────────────────

function WizardHeader({
  currentStep,
  totalSteps,
  onExit,
}: {
  currentStep: number;
  totalSteps: number;
  onExit: () => void;
}) {
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;
  const currentLabel = STEPS[currentStep - 1]?.label ?? '';

  return (
    <View style={styles.wizardHeader}>
      <View style={styles.wizardHeaderTop}>
        <TouchableOpacity onPress={onExit} style={styles.exitButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.exitIcon}>✕</Text>
        </TouchableOpacity>

        <View style={styles.wizardTitleWrapper}>
          <Text style={styles.wizardTitle}>New Listing</Text>
          <Text style={styles.wizardStepLabel}>
            Step {currentStep} of {totalSteps} — {currentLabel}
          </Text>
        </View>

        <TouchableOpacity style={styles.draftButton} onPress={() => {}}>
          <Text style={styles.draftButtonText}>Save Draft</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stepDotsRow}>
        {STEPS.map((step) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          return (
            <View key={step.number} style={styles.stepDotWrapper}>
              <View
                style={[
                  styles.stepDot,
                  isActive && styles.stepDotActive,
                  isCompleted && styles.stepDotCompleted,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.stepDotCheck}>✓</Text>
                ) : (
                  <Text style={[styles.stepDotNumber, isActive && styles.stepDotNumberActive]}>
                    {step.number}
                  </Text>
                )}
              </View>
              {step.number < STEPS.length && (
                <View style={[styles.stepConnector, isCompleted && styles.stepConnectorCompleted]} />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: progressWidth as string & number }]} />
      </View>
    </View>
  );
}

// ─── Step 1: Basic Information ─────────────────────────────────────────────────

function Step1BasicInfo({
  initialData,
  onNext,
}: {
  initialData: Step1Data | null;
  onNext: (data: Step1Data) => void;
}) {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: initialData?.title ?? '',
      propertyType: initialData?.propertyType ?? undefined,
      bedrooms: initialData?.bedrooms ?? 1,
      bathrooms: initialData?.bathrooms ?? 1,
      sizeSqm: initialData?.sizeSqm ?? '',
      yearBuilt: initialData?.yearBuilt ?? '',
      furnishing: initialData?.furnishing ?? undefined,
      description: initialData?.description ?? '',
    },
  });

  const watchedType = watch('propertyType');
  const watchedBedrooms = watch('bedrooms');
  const watchedTitle = watch('title');
  const watchedDescription = watch('description');

  const handleAutoTitle = useCallback(() => {
    if (!watchedType) return;
    const typeLabel = PROPERTY_TYPES.find((t) => t.id === watchedType)?.label ?? '';
    const bedroomPart = watchedType === 'self_contained' || watchedType === 'boys_quarters' || watchedType === 'mini_flat'
      ? ''
      : `${watchedBedrooms} `;
    const suggested = `Spacious ${bedroomPart}${typeLabel} in Lagos`.trim();
    setValue('title', suggested, { shouldValidate: true });
  }, [watchedType, watchedBedrooms, setValue]);

  const handleAutoDescription = useCallback(() => {
    if (!watchedType) return;
    const typeLabel = PROPERTY_TYPES.find((t) => t.id === watchedType)?.label ?? '';
    const suggested =
      `Beautiful and well-maintained ${typeLabel.toLowerCase()} available for rent. ` +
      `The property is located in a serene and secure environment with easy access to major roads and public transport. ` +
      `It features modern finishes and is suitable for working professionals and small families.`;
    setValue('description', suggested, { shouldValidate: true });
  }, [watchedType, setValue]);

  const onSubmit = (data: Step1FormData) => {
    onNext({
      title: data.title,
      propertyType: data.propertyType,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      sizeSqm: data.sizeSqm ?? '',
      yearBuilt: data.yearBuilt ?? '',
      furnishing: data.furnishing,
      description: data.description,
    });
  };

  const showBedroomStepper = watchedType !== 'self_contained' && watchedType !== 'boys_quarters';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.stepScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepHeading}>Basic Information</Text>
        <Text style={styles.stepSubheading}>
          Tell tenants what type of property you're listing.
        </Text>

        <FormSection title="Property Type *">
          <Controller
            control={control}
            name="propertyType"
            render={({ field: { onChange, value } }) => (
              <View style={styles.typeGrid}>
                {PROPERTY_TYPES.map((type) => {
                  const selected = value === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[styles.typeCard, selected && styles.typeCardSelected]}
                      onPress={() => {
                        onChange(type.id);
                        if (type.id === 'self_contained' || type.id === 'boys_quarters') {
                          setValue('bedrooms', 0);
                        } else if (value === 'self_contained' || value === 'boys_quarters') {
                          setValue('bedrooms', 1);
                        }
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.typeCardIcon}>{type.icon}</Text>
                      <Text style={[styles.typeCardLabel, selected && styles.typeCardLabelSelected]}>
                        {type.label}
                      </Text>
                      {selected && (
                        <View style={styles.typeCardCheck}>
                          <Text style={styles.typeCardCheckText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
          {errors.propertyType && <FieldError message={errors.propertyType.message} />}
        </FormSection>

        <FormSection title="Listing Title *">
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <View style={[styles.inputWrapper, errors.title && styles.inputWrapperError]}>
                  <TextInput
                    style={styles.titleInput}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g., Spacious 2 Bedroom Flat in Yaba"
                    placeholderTextColor="#BDBDBD"
                    maxLength={100}
                    autoCapitalize="sentences"
                    returnKeyType="done"
                    selectionColor={PRIMARY}
                    multiline={false}
                  />
                </View>
                <View style={styles.titleFooter}>
                  <TouchableOpacity
                    style={[styles.suggestButton, !watchedType && styles.suggestButtonDisabled]}
                    onPress={handleAutoTitle}
                    disabled={!watchedType}
                  >
                    <Text style={styles.suggestButtonText}>✨ Auto-suggest</Text>
                  </TouchableOpacity>
                  <Text style={[styles.charCount, value.length > 90 && styles.charCountWarn]}>
                    {value.length}/100
                  </Text>
                </View>
              </View>
            )}
          />
          {errors.title && <FieldError message={errors.title.message} />}
        </FormSection>

        <View style={styles.stepperRow}>
          {showBedroomStepper && (
            <FormSection title="Bedrooms *" style={styles.stepperHalf}>
              <Controller
                control={control}
                name="bedrooms"
                render={({ field: { onChange, value } }) => (
                  <StepperInput
                    value={value}
                    onChange={onChange}
                    min={0}
                    max={10}
                    label={value === 0 ? 'Studio' : value === 1 ? '1 bed' : `${value} beds`}
                  />
                )}
              />
              {errors.bedrooms && <FieldError message={errors.bedrooms.message} />}
            </FormSection>
          )}

          <FormSection title="Bathrooms *" style={showBedroomStepper ? styles.stepperHalf : styles.stepperFull}>
            <Controller
              control={control}
              name="bathrooms"
              render={({ field: { onChange, value } }) => (
                <StepperInput
                  value={value}
                  onChange={onChange}
                  min={1}
                  max={10}
                  label={value === 1 ? '1 bath' : `${value} baths`}
                />
              )}
            />
            {errors.bathrooms && <FieldError message={errors.bathrooms.message} />}
          </FormSection>
        </View>

        <View style={styles.stepperRow}>
          <FormSection title="Size (sqm)" style={styles.stepperHalf}>
            <Controller
              control={control}
              name="sizeSqm"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputWrapper, errors.sizeSqm && styles.inputWrapperError]}>
                  <TextInput
                    style={styles.compactInput}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g., 85"
                    placeholderTextColor="#BDBDBD"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    selectionColor={PRIMARY}
                  />
                  <Text style={styles.inputUnit}>sqm</Text>
                </View>
              )}
            />
            {errors.sizeSqm && <FieldError message={errors.sizeSqm.message} />}
            <Text style={styles.optionalHint}>Optional</Text>
          </FormSection>

          <FormSection title="Year Built" style={styles.stepperHalf}>
            <Controller
              control={control}
              name="yearBuilt"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputWrapper, errors.yearBuilt && styles.inputWrapperError]}>
                  <TextInput
                    style={styles.compactInput}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={`e.g., ${CURRENT_YEAR - 5}`}
                    placeholderTextColor="#BDBDBD"
                    keyboardType="number-pad"
                    maxLength={4}
                    returnKeyType="done"
                    selectionColor={PRIMARY}
                  />
                </View>
              )}
            />
            {errors.yearBuilt && <FieldError message={errors.yearBuilt.message} />}
            <Text style={styles.optionalHint}>Optional</Text>
          </FormSection>
        </View>

        <FormSection title="Furnishing Status *">
          <Controller
            control={control}
            name="furnishing"
            render={({ field: { onChange, value } }) => (
              <View style={styles.furnishingRow}>
                {FURNISHING_OPTIONS.map((option) => {
                  const selected = value === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.furnishCard, selected && styles.furnishCardSelected]}
                      onPress={() => onChange(option.value)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.furnishIcon}>{option.icon}</Text>
                      <Text style={[styles.furnishLabel, selected && styles.furnishLabelSelected]}>
                        {option.label}
                      </Text>
                      <Text style={styles.furnishDescription}>{option.description}</Text>
                      {selected && <View style={styles.furnishSelected} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
          {errors.furnishing && <FieldError message={errors.furnishing.message} />}
        </FormSection>

        <FormSection title="Property Description *">
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <View style={[styles.textareaWrapper, errors.description && styles.inputWrapperError]}>
                  <TextInput
                    style={styles.textarea}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={
                      'Describe your property in detail...\n\n' +
                      '• Location highlights (nearby landmarks, BRT access)\n' +
                      '• Property condition and finishes\n' +
                      '• Ideal tenant profile\n' +
                      '• Special features'
                    }
                    placeholderTextColor="#BDBDBD"
                    multiline
                    textAlignVertical="top"
                    maxLength={2000}
                    selectionColor={PRIMARY}
                  />
                </View>
                <View style={styles.titleFooter}>
                  <TouchableOpacity
                    style={[styles.suggestButton, !watchedType && styles.suggestButtonDisabled]}
                    onPress={handleAutoDescription}
                    disabled={!watchedType}
                  >
                    <Text style={styles.suggestButtonText}>✨ Auto-suggest</Text>
                  </TouchableOpacity>
                  <Text style={[styles.charCount, value.length > 1800 && styles.charCountWarn]}>
                    {value.length}/2000
                  </Text>
                </View>
              </View>
            )}
          />
          {errors.description && <FieldError message={errors.description.message} />}
          <View style={styles.descriptionTip}>
            <Text style={styles.descriptionTipText}>
              💡 Listings with detailed descriptions get 40% more inquiries. Mention nearby landmarks, BRT stops, and estate features.
            </Text>
          </View>
        </FormSection>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleSubmit(onSubmit)}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Continue: Location →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step 2: Location ─────────────────────────────────────────────────────────

function Step2Location({
  initialData,
  onNext,
  onBack,
}: {
  initialData: Step2Data | null;
  onNext: (data: Step2Data) => void;
  onBack: () => void;
}) {
  const mapRef = useRef<MapView>(null);
  const [areaPickerVisible, setAreaPickerVisible] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [landmarkInput, setLandmarkInput] = useState('');

  const defaultCoords = { lat: LAGOS_CENTER.lat, lng: LAGOS_CENTER.lng };

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      address: initialData?.address ?? '',
      area: initialData?.area ?? '',
      lga: initialData?.lga ?? '',
      coordinates: initialData?.coordinates ?? defaultCoords,
      nearbyLandmarks: initialData?.nearbyLandmarks ?? [],
    },
  });

  const watchedArea = watch('area');
  const watchedCoords = watch('coordinates');
  const watchedLandmarks = watch('nearbyLandmarks');

  const filteredAreas = LAGOS_AREAS.filter((a) =>
    a.area.toLowerCase().includes(areaSearch.toLowerCase()) ||
    a.lga.toLowerCase().includes(areaSearch.toLowerCase())
  );

  const handleAreaSelect = (entry: LagosAreaEntry) => {
    setValue('area', entry.area, { shouldValidate: true });
    setValue('lga', entry.lga);
    setValue('coordinates', { lat: entry.lat, lng: entry.lng }, { shouldValidate: true });
    setAreaPickerVisible(false);
    setAreaSearch('');

    mapRef.current?.animateToRegion(
      {
        latitude: entry.lat,
        longitude: entry.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      400
    );
  };

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setValue('coordinates', { lat: latitude, lng: longitude }, { shouldValidate: true });
  };

  const handleAddLandmark = (text?: string) => {
    const value = (text ?? landmarkInput).trim();
    if (!value) return;
    if (watchedLandmarks.length >= 5) return;
    if (watchedLandmarks.includes(value)) return;
    setValue('nearbyLandmarks', [...watchedLandmarks, value]);
    setLandmarkInput('');
  };

  const handleRemoveLandmark = (landmark: string) => {
    setValue('nearbyLandmarks', watchedLandmarks.filter((l) => l !== landmark));
  };

  const onSubmit = (data: Step2FormData) => {
    onNext({
      address: data.address,
      area: data.area,
      lga: data.lga,
      coordinates: data.coordinates,
      nearbyLandmarks: data.nearbyLandmarks,
    });
  };

  const mapRegion = {
    latitude: watchedCoords.lat,
    longitude: watchedCoords.lng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const availableSuggestions = LANDMARK_SUGGESTIONS.filter(
    (s) => !watchedLandmarks.includes(s)
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.stepScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepHeading}>Property Location</Text>
        <Text style={styles.stepSubheading}>
          Help tenants find your property. Be as specific as possible.
        </Text>

        <FormSection title="Area in Lagos *">
          <TouchableOpacity
            style={[styles.inputWrapper, styles.selectorWrapper, errors.area && styles.inputWrapperError]}
            onPress={() => setAreaPickerVisible(true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.selectorText, !watchedArea && styles.selectorPlaceholder]}>
              {watchedArea || 'Select area (e.g., Yaba, Lekki, Ikeja)'}
            </Text>
            {watchedArea ? (
              <View style={styles.lgaBadge}>
                <Text style={styles.lgaBadgeText}>{watch('lga')}</Text>
              </View>
            ) : (
              <Text style={styles.selectorChevron}>›</Text>
            )}
          </TouchableOpacity>
          {errors.area && <FieldError message={errors.area.message} />}
        </FormSection>

        <FormSection title="Street Address *">
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[styles.inputWrapper, errors.address && styles.inputWrapperError]}>
                <TextInput
                  style={styles.titleInput}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g., 14 Herbert Macaulay Way, Yaba"
                  placeholderTextColor="#BDBDBD"
                  maxLength={200}
                  autoCapitalize="words"
                  returnKeyType="done"
                  selectionColor={PRIMARY}
                />
              </View>
            )}
          />
          {errors.address && <FieldError message={errors.address.message} />}
          <Text style={styles.optionalHint}>Enter the full street address with house number</Text>
        </FormSection>

        <FormSection title="Pin Exact Location *">
          <View style={styles.mapHintRow}>
            <Text style={styles.mapHint}>📍 Tap on the map to pin the exact location</Text>
          </View>
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={mapRegion}
              onPress={handleMapPress}
              showsUserLocation={false}
              showsMyLocationButton={false}
              toolbarEnabled={false}
            >
              {watchedCoords.lat !== LAGOS_CENTER.lat && (
                <Marker
                  coordinate={{
                    latitude: watchedCoords.lat,
                    longitude: watchedCoords.lng,
                  }}
                  pinColor={PRIMARY}
                />
              )}
            </MapView>

            {!watchedArea && (
              <View style={styles.mapOverlayHint}>
                <Text style={styles.mapOverlayHintText}>
                  Select an area above to center the map, then tap to pin
                </Text>
              </View>
            )}
          </View>

          {watchedCoords.lat !== LAGOS_CENTER.lat && (
            <View style={styles.coordsRow}>
              <Text style={styles.coordsText}>
                📌 {watchedCoords.lat.toFixed(5)}, {watchedCoords.lng.toFixed(5)}
              </Text>
              <TouchableOpacity
                onPress={() => setValue('coordinates', defaultCoords)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.coordsReset}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}
          {errors.coordinates && <FieldError message="Please pin your property on the map" />}
        </FormSection>

        <FormSection title={`Nearby Landmarks (${watchedLandmarks.length}/5)`}>
          {watchedLandmarks.length > 0 && (
            <View style={styles.tagsContainer}>
              {watchedLandmarks.map((landmark) => (
                <View key={landmark} style={styles.tag}>
                  <Text style={styles.tagText}>{landmark}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveLandmark(landmark)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.tagRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {watchedLandmarks.length < 5 && (
            <View style={styles.landmarkInputRow}>
              <View style={[styles.inputWrapper, styles.landmarkInput]}>
                <TextInput
                  style={styles.titleInput}
                  value={landmarkInput}
                  onChangeText={setLandmarkInput}
                  placeholder="e.g., Yaba BRT Stop, UNILAG Gate"
                  placeholderTextColor="#BDBDBD"
                  maxLength={50}
                  returnKeyType="done"
                  selectionColor={PRIMARY}
                  onSubmitEditing={() => handleAddLandmark()}
                />
              </View>
              <TouchableOpacity
                style={[styles.addLandmarkButton, !landmarkInput.trim() && styles.addLandmarkButtonDisabled]}
                onPress={() => handleAddLandmark()}
                disabled={!landmarkInput.trim()}
              >
                <Text style={styles.addLandmarkButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {watchedLandmarks.length < 5 && availableSuggestions.length > 0 && (
            <View>
              <Text style={styles.suggestionsLabel}>Quick add:</Text>
              <View style={styles.suggestionsRow}>
                {availableSuggestions.slice(0, 6).map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionChip}
                    onPress={() => handleAddLandmark(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionChipText}>+ {suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {errors.nearbyLandmarks && <FieldError message={errors.nearbyLandmarks.message} />}
          <Text style={styles.optionalHint}>
            Optional — helps tenants find your property. Max 5 landmarks.
          </Text>
        </FormSection>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleSubmit(onSubmit)}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Continue: Photos →</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={areaPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAreaPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Area</Text>
            <TouchableOpacity onPress={() => { setAreaPickerVisible(false); setAreaSearch(''); }}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearch}>
            <View style={styles.modalSearchWrapper}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              <TextInput
                style={styles.modalSearchInput}
                value={areaSearch}
                onChangeText={setAreaSearch}
                placeholder="Search areas or LGAs..."
                placeholderTextColor="#BDBDBD"
                autoFocus
                selectionColor={PRIMARY}
                returnKeyType="search"
              />
              {areaSearch.length > 0 && (
                <TouchableOpacity onPress={() => setAreaSearch('')}>
                  <Text style={styles.modalSearchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filteredAreas}
            keyExtractor={(item) => item.area}
            renderItem={({ item }) => {
              const isSelected = watchedArea === item.area;
              return (
                <TouchableOpacity
                  style={[styles.areaRow, isSelected && styles.areaRowSelected]}
                  onPress={() => handleAreaSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.areaRowInfo}>
                    <Text style={[styles.areaRowName, isSelected && styles.areaRowNameSelected]}>
                      {item.area}
                    </Text>
                    <Text style={styles.areaRowLga}>{item.lga} LGA</Text>
                  </View>
                  {isSelected && (
                    <Text style={styles.areaRowCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.areaRowSeparator} />}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.areaList}
            ListEmptyComponent={
              <View style={styles.areaListEmpty}>
                <Text style={styles.areaListEmptyText}>No areas found for "{areaSearch}"</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Step 3: Photos & Media ────────────────────────────────────────────────────

function Step3Photos({
  initialData,
  onNext,
  onBack,
}: {
  initialData: Step3Data | null;
  onNext: (data: Step3Data) => void;
  onBack: () => void;
}) {
  const [photos, setPhotos] = useState<PhotoEntry[]>(
    initialData?.photos.map((p) => ({ ...p, uploading: false })) ?? []
  );
  const [virtualTourUrl, setVirtualTourUrl] = useState(initialData?.virtualTourUrl ?? '');

  const uploadedPhotos = photos.filter((p) => !p.uploading && p.downloadUrl);
  const isUploading = photos.some((p) => p.uploading);
  const canContinue = uploadedPhotos.length >= 5 && !isUploading;

  const pickAndUploadPhotos = useCallback(async () => {
    const remaining = 20 - photos.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    const uid = auth().currentUser?.uid ?? 'anonymous';
    const timestamp = Date.now();

    const newEntries: PhotoEntry[] = result.assets.map((asset, idx) => ({
      uri: asset.uri,
      storagePath: `properties/drafts/${uid}/${timestamp}_${photos.length + idx}.jpg`,
      downloadUrl: '',
      uploading: true,
    }));

    setPhotos((prev) => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      try {
        const ref = storage().ref(entry.storagePath);
        await ref.putFile(entry.uri);
        const url = await ref.getDownloadURL();
        setPhotos((prev) =>
          prev.map((p) =>
            p.storagePath === entry.storagePath
              ? { ...p, downloadUrl: url, uploading: false }
              : p
          )
        );
      } catch {
        setPhotos((prev) => prev.filter((p) => p.storagePath !== entry.storagePath));
        Alert.alert('Upload Failed', 'One of the photos could not be uploaded. Please try again.');
      }
    }
  }, [photos.length]);

  const removePhoto = useCallback((storagePath: string) => {
    setPhotos((prev) => prev.filter((p) => p.storagePath !== storagePath));
    storage().ref(storagePath).delete().catch(() => {});
  }, []);

  const handleContinue = () => {
    onNext({
      photos: uploadedPhotos.map((p) => ({
        uri: p.uri,
        storagePath: p.storagePath,
        downloadUrl: p.downloadUrl,
      })),
      virtualTourUrl: virtualTourUrl.trim(),
    });
  };

  const photoTileWidth = (SCREEN_WIDTH - 32 - 12) / 2;

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.stepScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepHeading}>Photos & Media</Text>
        <Text style={styles.stepSubheading}>
          Add at least 5 photos to help tenants see your property. The first photo will be the cover image.
        </Text>

        <FormSection title={`Property Photos (${uploadedPhotos.length}/20) *`}>
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={photo.storagePath} style={[styles.photoTile, { width: photoTileWidth, height: photoTileWidth * 0.75 }]}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                {photo.uploading && (
                  <View style={styles.photoOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )}
                {index === 0 && !photo.uploading && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
                {!photo.uploading && (
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => removePhoto(photo.storagePath)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {photos.length < 20 && (
              <TouchableOpacity
                style={[styles.addPhotoTile, { width: photoTileWidth, height: photoTileWidth * 0.75 }]}
                onPress={pickAndUploadPhotos}
                activeOpacity={0.7}
              >
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoLabel}>Add Photos</Text>
                <Text style={styles.addPhotoCount}>{20 - photos.length} remaining</Text>
              </TouchableOpacity>
            )}
          </View>

          {uploadedPhotos.length < 5 && (
            <Text style={styles.photoMinHint}>
              Minimum 5 photos required ({5 - uploadedPhotos.length} more needed)
            </Text>
          )}
        </FormSection>

        <View style={styles.photoTipsCard}>
          <Text style={styles.photoTipsTitle}>📸 Photo Tips for Better Engagement</Text>
          <Text style={styles.photoTipItem}>• Include all rooms</Text>
          <Text style={styles.photoTipItem}>• Show natural lighting</Text>
          <Text style={styles.photoTipItem}>• Capture exterior and compound</Text>
          <Text style={styles.photoTipItem}>• Clean and declutter before shooting</Text>
        </View>

        <FormSection title="Virtual Tour URL">
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.titleInput}
              value={virtualTourUrl}
              onChangeText={setVirtualTourUrl}
              placeholder="e.g., https://www.youtube.com/..."
              placeholderTextColor="#BDBDBD"
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
              selectionColor={PRIMARY}
            />
          </View>
          <Text style={styles.optionalHint}>Optional — YouTube, Vimeo, or Matterport link</Text>
        </FormSection>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Continue: Pricing →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 4: Pricing ───────────────────────────────────────────────────────────

function Step4Pricing({
  initialData,
  area,
  onNext,
  onBack,
}: {
  initialData: Step4Data | null;
  area: string;
  onNext: (data: Step4Data) => void;
  onBack: () => void;
}) {
  const isIsland = ISLAND_AREAS.includes(area);
  const marketRange = isIsland ? RENT_RANGES.island : RENT_RANGES.mainland;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step4FormData>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      annualRent: initialData?.annualRent ?? 0,
      cautionDepositMultiplier: initialData?.cautionDepositMultiplier ?? 1,
      serviceCharge: initialData?.serviceCharge ?? 0,
      agreementFee: initialData?.agreementFee ?? 0,
    },
  });

  const watchedRent = watch('annualRent');
  const watchedMultiplier = watch('cautionDepositMultiplier');
  const watchedService = watch('serviceCharge') ?? 0;
  const watchedAgreement = watch('agreementFee') ?? 0;

  const cautionAmount = watchedRent * watchedMultiplier;
  const platformFee = Math.round(watchedRent * 0.02);
  const totalCost = watchedRent + cautionAmount + watchedService + watchedAgreement + platformFee;
  const agentFee = Math.round(watchedRent * 0.15);
  const savings = agentFee;

  const onSubmit = (data: Step4FormData) => {
    onNext({
      annualRent: data.annualRent,
      cautionDepositMultiplier: data.cautionDepositMultiplier,
      serviceCharge: data.serviceCharge ?? 0,
      agreementFee: data.agreementFee ?? 0,
    });
  };

  const depositOptions: Array<{ label: string; value: 0.5 | 1 | 2 }> = [
    { label: '6 Months', value: 0.5 },
    { label: '1 Year', value: 1 },
    { label: '2 Years', value: 2 },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.stepScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepHeading}>Pricing</Text>
        <Text style={styles.stepSubheading}>
          Set your rental price and fees. All amounts are in Nigerian Naira (₦).
        </Text>

        <FormSection title="Annual Rent *">
          <Controller
            control={control}
            name="annualRent"
            render={({ field: { onChange, value } }) => (
              <View style={[styles.inputWrapper, errors.annualRent && styles.inputWrapperError]}>
                <Text style={styles.currencyPrefix}>₦</Text>
                <TextInput
                  style={styles.currencyInput}
                  value={formatCurrencyDisplay(value)}
                  onChangeText={(text) => onChange(parseCurrencyInput(text))}
                  placeholder="e.g., 500,000"
                  placeholderTextColor="#BDBDBD"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  selectionColor={PRIMARY}
                />
              </View>
            )}
          />
          {errors.annualRent && <FieldError message={errors.annualRent.message} />}

          <View style={styles.marketHintCard}>
            <Text style={styles.marketHintText}>
              📊 Similar properties in {area || 'this area'} rent for {formatNaira(marketRange.min)}–{formatNaira(marketRange.max)}/year
            </Text>
          </View>
        </FormSection>

        <FormSection title="Caution Deposit">
          <Controller
            control={control}
            name="cautionDepositMultiplier"
            render={({ field: { onChange, value } }) => (
              <View style={styles.depositRow}>
                {depositOptions.map((opt) => {
                  const selected = value === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.depositCard, selected && styles.depositCardSelected]}
                      onPress={() => onChange(opt.value)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.depositLabel, selected && styles.depositLabelSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={[styles.depositMultiplier, selected && styles.depositMultiplierSelected]}>
                        {opt.value}×
                      </Text>
                      {selected && <View style={styles.furnishSelected} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
          {watchedRent > 0 && (
            <Text style={styles.depositCalc}>= {formatNaira(cautionAmount)}</Text>
          )}
        </FormSection>

        <FormSection title="Service Charge">
          <Controller
            control={control}
            name="serviceCharge"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>₦</Text>
                <TextInput
                  style={styles.currencyInput}
                  value={formatCurrencyDisplay(value ?? 0)}
                  onChangeText={(text) => onChange(parseCurrencyInput(text))}
                  placeholder="e.g., 100,000"
                  placeholderTextColor="#BDBDBD"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  selectionColor={PRIMARY}
                />
              </View>
            )}
          />
          <Text style={styles.optionalHint}>Annual estate maintenance fee (optional)</Text>
        </FormSection>

        <FormSection title="Agreement Fee">
          <Controller
            control={control}
            name="agreementFee"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>₦</Text>
                <TextInput
                  style={styles.currencyInput}
                  value={formatCurrencyDisplay(value ?? 0)}
                  onChangeText={(text) => onChange(parseCurrencyInput(text))}
                  placeholder="e.g., 50,000"
                  placeholderTextColor="#BDBDBD"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  selectionColor={PRIMARY}
                />
              </View>
            )}
          />
          <Text style={styles.optionalHint}>One-time legal/documentation fee (optional)</Text>
        </FormSection>

        {watchedRent > 0 && (
          <View style={styles.costSummaryCard}>
            <Text style={styles.costSummaryTitle}>Total Tenant Cost</Text>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Annual Rent</Text>
              <Text style={styles.costValue}>{formatNaira(watchedRent)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Caution Deposit ({watchedMultiplier}×)</Text>
              <Text style={styles.costValue}>{formatNaira(cautionAmount)}</Text>
            </View>
            {watchedService > 0 && (
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Service Charge</Text>
                <Text style={styles.costValue}>{formatNaira(watchedService)}</Text>
              </View>
            )}
            {watchedAgreement > 0 && (
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Agreement Fee</Text>
                <Text style={styles.costValue}>{formatNaira(watchedAgreement)}</Text>
              </View>
            )}
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Platform Fee (2%)</Text>
              <Text style={styles.costValue}>{formatNaira(platformFee)}</Text>
            </View>
            <View style={styles.costDivider} />
            <View style={styles.costRow}>
              <Text style={styles.costTotalLabel}>TOTAL</Text>
              <Text style={styles.costTotalValue}>{formatNaira(totalCost)}</Text>
            </View>
            {savings > 0 && (
              <View style={styles.savingsRow}>
                <Text style={styles.savingsText}>
                  💰 Tenant saves {formatNaira(savings)} vs. using an agent
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleSubmit(onSubmit)}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Continue: Amenities →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step 5: Amenities & Rules ─────────────────────────────────────────────────

function Step5Amenities({
  initialData,
  onNext,
  onBack,
}: {
  initialData: Step5Data | null;
  onNext: (data: Step5Data) => void;
  onBack: () => void;
}) {
  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities ?? []);
  const [petPolicy, setPetPolicy] = useState<'no_pets' | 'small_pets' | 'all_pets'>(initialData?.petPolicy ?? 'no_pets');
  const [maxOccupants, setMaxOccupants] = useState(initialData?.maxOccupants ?? 2);
  const [rules, setRules] = useState<string[]>(initialData?.rules ?? []);
  const [ruleInput, setRuleInput] = useState('');

  const toggleAmenity = (label: string) => {
    setAmenities((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]
    );
  };

  const addRule = (text?: string) => {
    const value = (text ?? ruleInput).trim();
    if (!value || rules.length >= 10 || rules.includes(value)) return;
    setRules((prev) => [...prev, value]);
    setRuleInput('');
  };

  const removeRule = (rule: string) => {
    setRules((prev) => prev.filter((r) => r !== rule));
  };

  const handleContinue = () => {
    onNext({ amenities, petPolicy, maxOccupants, rules });
  };

  const availableSuggestedRules = SUGGESTED_RULES.filter((r) => !rules.includes(r));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.stepScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepHeading}>Amenities & Rules</Text>
        <Text style={styles.stepSubheading}>
          Select available amenities and set house rules for your property.
        </Text>

        <FormSection title="Available Amenities">
          <View style={styles.amenityGrid}>
            {AMENITIES_LIST.map((item) => {
              const selected = amenities.includes(item.label);
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.amenityCard, selected && styles.amenityCardSelected]}
                  onPress={() => toggleAmenity(item.label)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.amenityEmoji}>{item.emoji}</Text>
                  <Text style={[styles.amenityLabel, selected && styles.amenityLabelSelected]} numberOfLines={2}>
                    {item.label}
                  </Text>
                  {selected && (
                    <View style={styles.amenityCheck}>
                      <Text style={styles.amenityCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </FormSection>

        <FormSection title="Pet Policy *">
          <View style={styles.petRow}>
            {PET_POLICIES.map((policy) => {
              const selected = petPolicy === policy.value;
              return (
                <TouchableOpacity
                  key={policy.value}
                  style={[styles.petCard, selected && styles.petCardSelected]}
                  onPress={() => setPetPolicy(policy.value)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.petEmoji}>{policy.emoji}</Text>
                  <Text style={[styles.petLabel, selected && styles.petLabelSelected]}>
                    {policy.label}
                  </Text>
                  {selected && <View style={styles.furnishSelected} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </FormSection>

        <FormSection title="Maximum Occupants">
          <StepperInput
            value={maxOccupants}
            onChange={setMaxOccupants}
            min={1}
            max={10}
            label={maxOccupants === 1 ? '1 person' : `${maxOccupants} people`}
          />
        </FormSection>

        <FormSection title={`House Rules (${rules.length}/10)`}>
          {rules.length > 0 && (
            <View style={styles.tagsContainer}>
              {rules.map((rule) => (
                <View key={rule} style={styles.tag}>
                  <Text style={styles.tagText}>{rule}</Text>
                  <TouchableOpacity
                    onPress={() => removeRule(rule)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.tagRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {rules.length < 10 && (
            <View style={styles.landmarkInputRow}>
              <View style={[styles.inputWrapper, styles.landmarkInput]}>
                <TextInput
                  style={styles.titleInput}
                  value={ruleInput}
                  onChangeText={setRuleInput}
                  placeholder="Type a house rule..."
                  placeholderTextColor="#BDBDBD"
                  maxLength={100}
                  returnKeyType="done"
                  selectionColor={PRIMARY}
                  onSubmitEditing={() => addRule()}
                />
              </View>
              <TouchableOpacity
                style={[styles.addLandmarkButton, !ruleInput.trim() && styles.addLandmarkButtonDisabled]}
                onPress={() => addRule()}
                disabled={!ruleInput.trim()}
              >
                <Text style={styles.addLandmarkButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {rules.length < 10 && availableSuggestedRules.length > 0 && (
            <View>
              <Text style={styles.suggestionsLabel}>Suggested:</Text>
              <View style={styles.suggestionsRow}>
                {availableSuggestedRules.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionChip}
                    onPress={() => addRule(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionChipText}>+ {suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.optionalHint}>Optional — add up to 10 house rules</Text>
        </FormSection>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Continue: Review →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step 6: Review & Publish ──────────────────────────────────────────────────

function Step6Review({
  step1Data,
  step2Data,
  step3Data,
  step4Data,
  step5Data,
  onBack,
}: {
  step1Data: Step1Data;
  step2Data: Step2Data;
  step3Data: Step3Data;
  step4Data: Step4Data;
  step5Data: Step5Data;
  onBack: () => void;
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const typeInfo = PROPERTY_TYPES.find((t) => t.id === step1Data.propertyType);
  const furnishInfo = FURNISHING_OPTIONS.find((f) => f.value === step1Data.furnishing);
  const petInfo = PET_POLICIES.find((p) => p.value === step5Data.petPolicy);

  const cautionAmount = step4Data.annualRent * step4Data.cautionDepositMultiplier;
  const platformFee = Math.round(step4Data.annualRent * 0.02);
  const totalCost = step4Data.annualRent + cautionAmount + step4Data.serviceCharge + step4Data.agreementFee + platformFee;
  const agentSavings = Math.round(step4Data.annualRent * 0.15);

  const buildPropertyDoc = (status: 'active' | 'draft') => ({
    title: step1Data.title,
    propertyType: step1Data.propertyType,
    bedrooms: step1Data.bedrooms,
    bathrooms: step1Data.bathrooms,
    sizeSqm: step1Data.sizeSqm ? Number(step1Data.sizeSqm) : null,
    yearBuilt: step1Data.yearBuilt ? Number(step1Data.yearBuilt) : null,
    furnishing: step1Data.furnishing,
    description: step1Data.description,
    location: {
      address: step2Data.address,
      area: step2Data.area,
      lga: step2Data.lga,
      coordinates: new firestore.GeoPoint(step2Data.coordinates.lat, step2Data.coordinates.lng),
      nearbyLandmarks: step2Data.nearbyLandmarks,
    },
    photos: step3Data.photos.map((p, i) => ({
      url: p.downloadUrl,
      storagePath: p.storagePath,
      isPrimary: i === 0,
    })),
    virtualTourUrl: step3Data.virtualTourUrl || null,
    pricing: {
      annualRent: step4Data.annualRent,
      cautionDepositMultiplier: step4Data.cautionDepositMultiplier,
      cautionDeposit: cautionAmount,
      serviceCharge: step4Data.serviceCharge,
      agreementFee: step4Data.agreementFee,
      platformFee,
      totalCost,
    },
    amenities: step5Data.amenities,
    petPolicy: step5Data.petPolicy,
    maxOccupants: step5Data.maxOccupants,
    rules: step5Data.rules,
    landlordId: auth().currentUser?.uid ?? '',
    status: {
      listing: status,
      availability: status === 'active' ? 'available' : 'draft',
      verified: false,
    },
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  const handlePublish = async () => {
    if (!termsAccepted) return;
    setPublishing(true);
    setPublishError('');
    try {
      await firestore().collection('properties').add(buildPropertyDoc('active'));
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setPublishError(message);
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setPublishError('');
    try {
      await firestore().collection('properties').add(buildPropertyDoc('draft'));
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save draft. Please try again.';
      setPublishError(message);
    } finally {
      setSavingDraft(false);
    }
  };

  const coverPhoto = step3Data.photos[0];

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.stepScroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepHeading}>Review & Publish</Text>
        <Text style={styles.stepSubheading}>
          Review your listing before publishing. Make sure everything looks good.
        </Text>

        {/* Cover photo */}
        {coverPhoto && (
          <View style={styles.reviewCoverWrap}>
            <Image source={{ uri: coverPhoto.uri }} style={styles.reviewCoverImage} />
            <View style={styles.reviewPhotoBadge}>
              <Text style={styles.reviewPhotoBadgeText}>{step3Data.photos.length} photos</Text>
            </View>
          </View>
        )}

        {/* Title & Type */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewTitle}>{step1Data.title}</Text>
          <View style={styles.reviewTypeRow}>
            <Text style={styles.reviewTypeText}>{typeInfo?.icon} {typeInfo?.label}</Text>
            {furnishInfo && (
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewBadgeText}>{furnishInfo.label}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Key details */}
        <View style={styles.reviewDetailsRow}>
          <View style={styles.reviewDetailChip}>
            <Text style={styles.reviewDetailIcon}>🛏️</Text>
            <Text style={styles.reviewDetailValue}>{step1Data.bedrooms} bed</Text>
          </View>
          <View style={styles.reviewDetailChip}>
            <Text style={styles.reviewDetailIcon}>🚿</Text>
            <Text style={styles.reviewDetailValue}>{step1Data.bathrooms} bath</Text>
          </View>
          {step1Data.sizeSqm ? (
            <View style={styles.reviewDetailChip}>
              <Text style={styles.reviewDetailIcon}>📐</Text>
              <Text style={styles.reviewDetailValue}>{step1Data.sizeSqm} sqm</Text>
            </View>
          ) : null}
          {step1Data.yearBuilt ? (
            <View style={styles.reviewDetailChip}>
              <Text style={styles.reviewDetailIcon}>🏗️</Text>
              <Text style={styles.reviewDetailValue}>{step1Data.yearBuilt}</Text>
            </View>
          ) : null}
        </View>

        {/* Location */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Location</Text>
          <Text style={styles.reviewLocationArea}>{step2Data.area}, {step2Data.lga} LGA</Text>
          <Text style={styles.reviewLocationAddress}>{step2Data.address}</Text>
          {step2Data.nearbyLandmarks.length > 0 && (
            <View style={styles.reviewLandmarks}>
              {step2Data.nearbyLandmarks.map((lm) => (
                <View key={lm} style={styles.reviewLandmarkChip}>
                  <Text style={styles.reviewLandmarkText}>{lm}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Cost breakdown */}
        <View style={styles.costSummaryCard}>
          <Text style={styles.costSummaryTitle}>Cost Breakdown</Text>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Annual Rent</Text>
            <Text style={styles.costValue}>{formatNaira(step4Data.annualRent)}</Text>
          </View>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Caution Deposit ({step4Data.cautionDepositMultiplier}×)</Text>
            <Text style={styles.costValue}>{formatNaira(cautionAmount)}</Text>
          </View>
          {step4Data.serviceCharge > 0 && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Service Charge</Text>
              <Text style={styles.costValue}>{formatNaira(step4Data.serviceCharge)}</Text>
            </View>
          )}
          {step4Data.agreementFee > 0 && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Agreement Fee</Text>
              <Text style={styles.costValue}>{formatNaira(step4Data.agreementFee)}</Text>
            </View>
          )}
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Platform Fee (2%)</Text>
            <Text style={styles.costValue}>{formatNaira(platformFee)}</Text>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costRow}>
            <Text style={styles.costTotalLabel}>TOTAL</Text>
            <Text style={styles.costTotalValue}>{formatNaira(totalCost)}</Text>
          </View>
          {agentSavings > 0 && (
            <View style={styles.savingsRow}>
              <Text style={styles.savingsText}>
                💰 Tenant saves {formatNaira(agentSavings)} vs. using an agent
              </Text>
            </View>
          )}
        </View>

        {/* Amenities */}
        {step5Data.amenities.length > 0 && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Amenities</Text>
            <View style={styles.reviewAmenities}>
              {step5Data.amenities.map((a) => {
                const info = AMENITIES_LIST.find((am) => am.label === a);
                return (
                  <View key={a} style={styles.reviewAmenityChip}>
                    <Text style={styles.reviewAmenityText}>{info?.emoji} {a}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* House Rules */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>House Rules</Text>
          <View style={styles.reviewRulesRow}>
            {petInfo && (
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewBadgeText}>{petInfo.emoji} {petInfo.label}</Text>
              </View>
            )}
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>Max {step5Data.maxOccupants} occupants</Text>
            </View>
          </View>
          {step5Data.rules.length > 0 && (
            <View style={styles.reviewLandmarks}>
              {step5Data.rules.map((rule) => (
                <View key={rule} style={styles.reviewLandmarkChip}>
                  <Text style={styles.reviewLandmarkText}>{rule}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Description</Text>
          <Text
            style={styles.reviewDescription}
            numberOfLines={descriptionExpanded ? undefined : 3}
          >
            {step1Data.description}
          </Text>
          {step1Data.description.length > 150 && (
            <TouchableOpacity onPress={() => setDescriptionExpanded(!descriptionExpanded)}>
              <Text style={styles.readMoreText}>
                {descriptionExpanded ? 'Show less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Terms */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setTermsAccepted(!termsAccepted)}
          activeOpacity={0.75}
        >
          <View style={[styles.termsCheckbox, termsAccepted && styles.termsCheckboxChecked]}>
            {termsAccepted && <Text style={styles.termsCheckmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I confirm this listing is accurate and I agree to Directrent's Terms & Conditions
          </Text>
        </TouchableOpacity>

        {publishError ? (
          <Text style={styles.publishError}>{publishError}</Text>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.reviewFooter}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.reviewFooterActions}>
          <TouchableOpacity
            style={[styles.publishButton, (!termsAccepted || publishing) && styles.nextButtonDisabled]}
            onPress={handlePublish}
            disabled={!termsAccepted || publishing}
            activeOpacity={0.85}
          >
            {publishing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.nextButtonText}>🚀 Publish Listing</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.draftOutlineButton, savingDraft && styles.nextButtonDisabled]}
            onPress={handleSaveDraft}
            disabled={savingDraft}
            activeOpacity={0.85}
          >
            {savingDraft ? (
              <ActivityIndicator color={PRIMARY} size="small" />
            ) : (
              <Text style={styles.draftOutlineText}>Save as Draft</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function FormSection({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.formSection, style]}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function StepperInput({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={[styles.stepperButton, value <= min && styles.stepperButtonDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.stepperIcon, value <= min && styles.stepperIconDisabled]}>−</Text>
      </TouchableOpacity>

      <View style={styles.stepperValue}>
        <Text style={styles.stepperNumber}>{value}</Text>
        <Text style={styles.stepperLabel}>{label}</Text>
      </View>

      <TouchableOpacity
        style={[styles.stepperButton, value >= max && styles.stepperButtonDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.stepperIcon, value >= max && styles.stepperIconDisabled]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  // Wizard header
  wizardHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  wizardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitIcon: { fontSize: 16, color: TEXT_SECONDARY, fontWeight: '600' },
  wizardTitleWrapper: { flex: 1, alignItems: 'center' },
  wizardTitle: { fontSize: 16, fontWeight: '700', color: TEXT_COLOR },
  wizardStepLabel: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  draftButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  draftButtonText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  // Step dots
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepDotWrapper: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  stepDotCompleted: { borderColor: PRIMARY, backgroundColor: PRIMARY },
  stepDotNumber: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '700' },
  stepDotNumberActive: { color: PRIMARY },
  stepDotCheck: { fontSize: 12, color: '#fff', fontWeight: '700' },
  stepConnector: { width: 16, height: 2, backgroundColor: BORDER, marginHorizontal: 2 },
  stepConnectorCompleted: { backgroundColor: PRIMARY },

  // Progress bar
  progressBar: { height: 3, backgroundColor: BORDER, marginHorizontal: -16 },
  progressFill: { height: '100%', backgroundColor: PRIMARY },

  // Step content
  stepScroll: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: BG,
  },
  stepHeading: { fontSize: 22, fontWeight: '700', color: TEXT_COLOR, marginBottom: 6 },
  stepSubheading: { fontSize: 14, color: TEXT_SECONDARY, lineHeight: 20, marginBottom: 24 },

  // Form sections
  formSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: TEXT_COLOR, marginBottom: 10 },

  // Property type grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '47.5%' as unknown as number,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
    position: 'relative',
  },
  typeCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  typeCardIcon: { fontSize: 24, marginBottom: 8 },
  typeCardLabel: { fontSize: 13, fontWeight: '700', color: TEXT_COLOR },
  typeCardLabelSelected: { color: PRIMARY },
  typeCardCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardCheckText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Input wrapper
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputWrapperError: { borderColor: ERROR_COLOR },
  titleInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT_COLOR,
    paddingVertical: 12,
  },
  titleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F9A825',
  },
  suggestButtonDisabled: { opacity: 0.4 },
  suggestButtonText: { fontSize: 12, color: '#5D4037', fontWeight: '600' },
  charCount: { fontSize: 12, color: TEXT_SECONDARY },
  charCountWarn: { color: '#E65100' },

  // Stepper row
  stepperRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  stepperHalf: { flex: 1, marginBottom: 0 },
  stepperFull: { flex: 2, marginBottom: 0 },

  // Stepper input
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    overflow: 'hidden',
  },
  stepperButton: {
    width: 44,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  stepperButtonDisabled: { backgroundColor: '#FAFAFA' },
  stepperIcon: { fontSize: 22, color: PRIMARY, fontWeight: '400', lineHeight: 26 },
  stepperIconDisabled: { color: BORDER },
  stepperValue: { flex: 1, alignItems: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER, height: 50, justifyContent: 'center' },
  stepperNumber: { fontSize: 20, fontWeight: '700', color: TEXT_COLOR, lineHeight: 24 },
  stepperLabel: { fontSize: 10, color: TEXT_SECONDARY, marginTop: 2 },

  // Compact input
  compactInput: {
    flex: 1,
    fontSize: 16,
    color: TEXT_COLOR,
    paddingVertical: 12,
    fontWeight: '600',
  },
  inputUnit: { fontSize: 13, color: TEXT_SECONDARY, paddingRight: 4 },
  optionalHint: { fontSize: 11, color: '#9E9E9E', marginTop: 4 },

  // Furnishing cards
  furnishingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  furnishCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    minHeight: 90,
    justifyContent: 'center',
  },
  furnishCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  furnishIcon: { fontSize: 22, marginBottom: 6 },
  furnishLabel: { fontSize: 12, fontWeight: '700', color: TEXT_COLOR, textAlign: 'center' },
  furnishLabelSelected: { color: PRIMARY },
  furnishDescription: { fontSize: 10, color: TEXT_SECONDARY, textAlign: 'center', marginTop: 3, lineHeight: 14 },
  furnishSelected: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },

  // Description textarea
  textareaWrapper: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 14,
    minHeight: 160,
  },
  textarea: {
    fontSize: 14,
    color: TEXT_COLOR,
    lineHeight: 21,
    minHeight: 140,
  },
  descriptionTip: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1976D2',
  },
  descriptionTipText: { fontSize: 12, color: '#1565C0', lineHeight: 18 },

  // Field error
  fieldError: { fontSize: 12, color: ERROR_COLOR, marginTop: 6 },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#fff',
  },
  backButton: {
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { fontSize: 15, color: TEXT_SECONDARY, fontWeight: '600' },
  nextButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  nextButtonText: { fontSize: 15, color: '#fff', fontWeight: '700', letterSpacing: 0.2 },
  nextButtonDisabled: { opacity: 0.5 },

  // Step 2: Location
  selectorWrapper: { justifyContent: 'space-between' },
  selectorText: { flex: 1, fontSize: 15, color: TEXT_COLOR, paddingVertical: 14 },
  selectorPlaceholder: { color: '#BDBDBD' },
  selectorChevron: { fontSize: 22, color: '#BDBDBD', fontWeight: '300' },
  lgaBadge: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  lgaBadgeText: { fontSize: 12, color: PRIMARY, fontWeight: '700' },

  // Map
  mapHintRow: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F57C00',
  },
  mapHint: { fontSize: 12, color: '#E65100', fontWeight: '500' },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: BORDER,
    position: 'relative',
  },
  map: { flex: 1 },
  mapOverlayHint: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapOverlayHintText: { color: '#fff', fontSize: 12, textAlign: 'center' },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  coordsText: { fontSize: 12, color: TEXT_SECONDARY, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  coordsReset: { fontSize: 12, color: ERROR_COLOR, textDecorationLine: 'underline' },

  // Tags
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY_LIGHT,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  tagRemove: { fontSize: 12, color: PRIMARY, fontWeight: '700' },

  // Landmark input row
  landmarkInputRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  landmarkInput: { flex: 1 },
  addLandmarkButton: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLandmarkButtonDisabled: { backgroundColor: '#A5D6A7' },
  addLandmarkButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Suggestion chips
  suggestionsLabel: { fontSize: 12, color: TEXT_SECONDARY, marginBottom: 8, fontWeight: '600' },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  suggestionChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionChipText: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '500' },

  // Area Picker Modal
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: TEXT_COLOR },
  modalClose: { fontSize: 16, color: PRIMARY, fontWeight: '600' },
  modalSearch: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  modalSearchIcon: { fontSize: 16 },
  modalSearchInput: { flex: 1, fontSize: 15, color: TEXT_COLOR },
  modalSearchClear: { fontSize: 14, color: TEXT_SECONDARY, fontWeight: '600' },
  areaList: { paddingBottom: 40 },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  areaRowSelected: { backgroundColor: PRIMARY_LIGHT },
  areaRowInfo: { flex: 1 },
  areaRowName: { fontSize: 16, fontWeight: '600', color: TEXT_COLOR, marginBottom: 2 },
  areaRowNameSelected: { color: PRIMARY },
  areaRowLga: { fontSize: 13, color: TEXT_SECONDARY },
  areaRowCheck: { fontSize: 18, color: PRIMARY, fontWeight: '700', marginLeft: 12 },
  areaRowSeparator: { height: 1, backgroundColor: BORDER, marginLeft: 16 },
  areaListEmpty: { paddingVertical: 40, alignItems: 'center' },
  areaListEmptyText: { fontSize: 14, color: TEXT_SECONDARY },

  // Step 3: Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoTile: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E0E0E0',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  coverBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  addPhotoTile: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  addPhotoIcon: { fontSize: 28, marginBottom: 4 },
  addPhotoLabel: { fontSize: 13, fontWeight: '600', color: TEXT_COLOR },
  addPhotoCount: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  photoMinHint: {
    fontSize: 12,
    color: ERROR_COLOR,
    marginTop: 10,
    fontWeight: '500',
  },
  photoTipsCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#1976D2',
  },
  photoTipsTitle: { fontSize: 13, fontWeight: '700', color: '#1565C0', marginBottom: 8 },
  photoTipItem: { fontSize: 12, color: '#1565C0', lineHeight: 20 },

  // Step 4: Pricing
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY,
    marginRight: 4,
  },
  currencyInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_COLOR,
    paddingVertical: 12,
  },
  marketHintCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  marketHintText: { fontSize: 12, color: PRIMARY, lineHeight: 18 },
  depositRow: {
    flexDirection: 'row',
    gap: 10,
  },
  depositCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  depositCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  depositLabel: { fontSize: 13, fontWeight: '700', color: TEXT_COLOR },
  depositLabelSelected: { color: PRIMARY },
  depositMultiplier: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 4 },
  depositMultiplierSelected: { color: PRIMARY },
  depositCalc: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY,
    marginTop: 8,
  },
  costSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    marginBottom: 24,
  },
  costSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 14,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  costLabel: { fontSize: 14, color: TEXT_SECONDARY },
  costValue: { fontSize: 14, fontWeight: '600', color: TEXT_COLOR },
  costDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 8,
  },
  costTotalLabel: { fontSize: 16, fontWeight: '700', color: TEXT_COLOR },
  costTotalValue: { fontSize: 18, fontWeight: '700', color: PRIMARY },
  savingsRow: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  savingsText: { fontSize: 13, color: PRIMARY, fontWeight: '600', textAlign: 'center' },

  // Step 5: Amenities
  amenityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityCard: {
    width: '47%' as unknown as number,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  amenityCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  amenityEmoji: { fontSize: 18 },
  amenityLabel: { fontSize: 12, color: TEXT_COLOR, flex: 1 },
  amenityLabelSelected: { color: PRIMARY, fontWeight: '600' },
  amenityCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityCheckText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  petRow: {
    flexDirection: 'row',
    gap: 10,
  },
  petCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  petCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  petEmoji: { fontSize: 24, marginBottom: 6 },
  petLabel: { fontSize: 12, fontWeight: '700', color: TEXT_COLOR, textAlign: 'center' },
  petLabelSelected: { color: PRIMARY },

  // Step 6: Review
  reviewCoverWrap: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  reviewCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  reviewPhotoBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  reviewPhotoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  reviewSection: {
    marginBottom: 20,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 6,
  },
  reviewTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  reviewTypeText: { fontSize: 14, color: TEXT_SECONDARY },
  reviewBadge: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  reviewBadgeText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  reviewDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  reviewDetailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  reviewDetailIcon: { fontSize: 14 },
  reviewDetailValue: { fontSize: 13, fontWeight: '600', color: TEXT_COLOR },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 10,
  },
  reviewLocationArea: { fontSize: 15, fontWeight: '600', color: TEXT_COLOR, marginBottom: 4 },
  reviewLocationAddress: { fontSize: 14, color: TEXT_SECONDARY, marginBottom: 8 },
  reviewLandmarks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  reviewLandmarkChip: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reviewLandmarkText: { fontSize: 12, color: TEXT_SECONDARY },
  reviewAmenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewAmenityChip: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reviewAmenityText: { fontSize: 12, color: PRIMARY, fontWeight: '500' },
  reviewRulesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  reviewDescription: {
    fontSize: 14,
    color: TEXT_COLOR,
    lineHeight: 22,
  },
  readMoreText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
    marginTop: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  termsCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsCheckboxChecked: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  termsCheckmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_COLOR,
    lineHeight: 20,
  },
  publishError: {
    fontSize: 13,
    color: ERROR_COLOR,
    textAlign: 'center',
    marginBottom: 12,
  },
  reviewFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#fff',
    alignItems: 'flex-start',
  },
  reviewFooterActions: {
    flex: 1,
    gap: 8,
  },
  publishButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  draftOutlineButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftOutlineText: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: '600',
  },
});
