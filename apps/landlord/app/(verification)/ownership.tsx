/**
 * FL-004: Property Ownership Verification Screen
 * Landlord uploads documents proving property ownership.
 * Documents are uploaded to Firebase Storage and the landlord's
 * Firestore doc is updated with references for admin review.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const ERROR = '#D32F2F';
const TEXT = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';

type DocumentType =
  | 'deed_of_assignment'
  | 'c_of_o'
  | 'governors_consent'
  | 'survey_plan'
  | 'utility_bill';

interface DocumentOption {
  type: DocumentType;
  label: string;
  description: string;
  required: boolean;
  icon: string;
}

const DOCUMENT_OPTIONS: DocumentOption[] = [
  {
    type: 'deed_of_assignment',
    label: 'Deed of Assignment',
    description: 'Primary proof of property ownership transfer',
    required: true,
    icon: '📜',
  },
  {
    type: 'utility_bill',
    label: 'Utility Bill (Property Address)',
    description: 'Recent electricity or water bill showing the property address',
    required: true,
    icon: '⚡',
  },
  {
    type: 'c_of_o',
    label: 'Certificate of Occupancy',
    description: 'C of O issued by the Lagos State government',
    required: false,
    icon: '🏛️',
  },
  {
    type: 'governors_consent',
    label: "Governor's Consent",
    description: "Governor's consent for the property",
    required: false,
    icon: '📋',
  },
  {
    type: 'survey_plan',
    label: 'Survey Plan',
    description: 'Official survey plan of the property',
    required: false,
    icon: '🗺️',
  },
];

interface UploadedDoc {
  type: DocumentType;
  uri: string;
  storagePath?: string;
  downloadUrl?: string;
  uploading: boolean;
  uploaded: boolean;
}

export default function OwnershipVerificationScreen() {
  const [documents, setDocuments] = useState<Record<DocumentType, UploadedDoc | null>>({
    deed_of_assignment: null,
    c_of_o: null,
    governors_consent: null,
    survey_plan: null,
    utility_bill: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredTypes: DocumentType[] = ['deed_of_assignment', 'utility_bill'];
  const allRequiredUploaded = requiredTypes.every(
    (t) => documents[t]?.uploaded === true
  );

  const handlePickDocument = async (docType: DocumentType) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to upload documents.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    // Mark as uploading
    const newDoc: UploadedDoc = {
      type: docType,
      uri: asset.uri,
      uploading: true,
      uploaded: false,
    };
    setDocuments((prev) => ({ ...prev, [docType]: newDoc }));
    setError(null);

    try {
      const filename = `${docType}_${Date.now()}.jpg`;
      const storagePath = `users/${uid}/ownership_documents/${filename}`;
      const ref = storage().ref(storagePath);

      await ref.putFile(asset.uri);
      const downloadUrl = await ref.getDownloadURL();

      setDocuments((prev) => ({
        ...prev,
        [docType]: {
          ...newDoc,
          storagePath,
          downloadUrl,
          uploading: false,
          uploaded: true,
        },
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(`Failed to upload ${docType.replace(/_/g, ' ')}: ${message}`);
      setDocuments((prev) => ({ ...prev, [docType]: null }));
    }
  };

  const handleRemoveDocument = (docType: DocumentType) => {
    setDocuments((prev) => ({ ...prev, [docType]: null }));
  };

  const handleSubmit = async () => {
    if (!allRequiredUploaded || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const uid = auth().currentUser?.uid;
      if (!uid) throw new Error('Not authenticated');

      // Build the document list for Firestore
      const uploadedDocs = Object.values(documents)
        .filter((d): d is UploadedDoc => d !== null && d.uploaded)
        .map((d) => ({
          type: d.type,
          url: d.downloadUrl!,
          storagePath: d.storagePath!,
          verified: false,
          uploadedAt: firestore.FieldValue.serverTimestamp(),
        }));

      await firestore().collection('landlords').doc(uid).update({
        'ownershipVerification.status': 'pending',
        'ownershipVerification.documents': uploadedDocs,
        'ownershipVerification.submittedAt': firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>📬</Text>
          </View>
          <Text style={styles.successTitle}>Documents Submitted!</Text>
          <Text style={styles.successSubtitle}>
            Your ownership documents are under review. We typically verify within 1–2 business days.
            {'\n\n'}
            You'll receive a notification once your account is verified and ready to list properties.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>🏠</Text>
        </View>

        <Text style={styles.heading}>Property Ownership</Text>
        <Text style={styles.subheading}>
          Upload documents proving you own the property. This step ensures only genuine landlords list on Directrent.
        </Text>

        {/* Required docs notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            ✱ <Text style={styles.noticeBold}>Deed of Assignment</Text> and{' '}
            <Text style={styles.noticeBold}>Utility Bill</Text> are required.
            Other documents are optional but increase verification speed.
          </Text>
        </View>

        {/* Document upload list */}
        {DOCUMENT_OPTIONS.map((option) => {
          const doc = documents[option.type];
          const isUploaded = doc?.uploaded === true;
          const isUploading = doc?.uploading === true;

          return (
            <View key={option.type} style={[styles.docCard, isUploaded && styles.docCardUploaded]}>
              <View style={styles.docHeader}>
                <View style={styles.docIconWrapper}>
                  <Text style={styles.docIcon}>{option.icon}</Text>
                </View>
                <View style={styles.docInfo}>
                  <View style={styles.docTitleRow}>
                    <Text style={styles.docLabel}>{option.label}</Text>
                    {option.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.docDescription}>{option.description}</Text>
                </View>
              </View>

              {/* Upload area */}
              {isUploaded && doc ? (
                <View style={styles.uploadedRow}>
                  <Image source={{ uri: doc.uri }} style={styles.docThumb} />
                  <View style={styles.uploadedInfo}>
                    <Text style={styles.uploadedLabel}>✓ Uploaded</Text>
                    <TouchableOpacity onPress={() => handleRemoveDocument(option.type)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : isUploading ? (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => handlePickDocument(option.type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.uploadButtonIcon}>📎</Text>
                  <Text style={styles.uploadButtonText}>
                    {option.required ? 'Upload Document' : 'Upload (Optional)'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Guidelines */}
        <View style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>📋 Upload Guidelines</Text>
          {[
            'Documents must be clear and legible',
            'Accepted formats: JPEG, PNG (max 10MB)',
            'Scanned copies of originals are accepted',
            'Documents must be current (utility bills within 3 months)',
          ].map((item) => (
            <Text key={item} style={styles.guidelineItem}>• {item}</Text>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, (!allRequiredUploaded || submitting) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!allRequiredUploaded || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Submit for Verification</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.skipText}>Complete later</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginLeft: -8 },
  backIcon: { fontSize: 22, color: TEXT, fontWeight: '600' },
  iconWrapper: { alignItems: 'center', marginBottom: 16 },
  icon: { fontSize: 56 },
  heading: { fontSize: 26, fontWeight: '700', color: TEXT, marginBottom: 8, textAlign: 'center' },
  subheading: { fontSize: 15, color: TEXT_SECONDARY, lineHeight: 22, marginBottom: 20, textAlign: 'center' },
  noticeCard: { backgroundColor: '#FFF8E1', borderRadius: 10, padding: 14, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: '#F9A825' },
  noticeText: { fontSize: 13, color: '#5D4037', lineHeight: 19 },
  noticeBold: { fontWeight: '700' },
  docCard: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, padding: 16, marginBottom: 12, backgroundColor: '#FAFAFA' },
  docCardUploaded: { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  docHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  docIconWrapper: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  docIcon: { fontSize: 20 },
  docInfo: { flex: 1 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  docLabel: { fontSize: 14, fontWeight: '700', color: TEXT },
  requiredBadge: { backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  requiredText: { fontSize: 10, color: ERROR, fontWeight: '700' },
  docDescription: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 17 },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 8, borderStyle: 'dashed' },
  uploadButtonIcon: { fontSize: 16 },
  uploadButtonText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  uploadedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: BORDER },
  uploadedInfo: { flex: 1 },
  uploadedLabel: { fontSize: 14, color: PRIMARY, fontWeight: '700', marginBottom: 4 },
  removeText: { fontSize: 13, color: ERROR, textDecorationLine: 'underline' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  uploadingText: { fontSize: 14, color: TEXT_SECONDARY },
  errorContainer: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: ERROR, marginBottom: 16 },
  errorText: { fontSize: 13, color: ERROR, lineHeight: 18 },
  guidelines: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 16, marginBottom: 24 },
  guidelinesTitle: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 10 },
  guidelineItem: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 22 },
  button: { backgroundColor: PRIMARY, borderRadius: 12, height: 54, alignItems: 'center', justifyContent: 'center', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginBottom: 16 },
  buttonDisabled: { backgroundColor: '#A5D6A7', shadowOpacity: 0, elevation: 0 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skipButton: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: TEXT_SECONDARY, textDecorationLine: 'underline' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 3, borderColor: PRIMARY },
  successCheck: { fontSize: 44 },
  successTitle: { fontSize: 28, fontWeight: '700', color: PRIMARY, marginBottom: 12 },
  successSubtitle: { fontSize: 15, color: TEXT_SECONDARY, lineHeight: 22, textAlign: 'center', marginBottom: 40 },
});
