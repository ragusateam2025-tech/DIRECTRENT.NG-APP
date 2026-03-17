import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { RootState } from '../store';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';
const ERROR = '#C62828';

const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank', code: '023' },
  { name: 'Ecobank', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'GTBank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'Standard Chartered', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank', code: '032' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'VFD Microfinance Bank', code: '566' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
];

export default function BankAccountScreen() {
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [selectedBank, setSelectedBank] = useState<{ name: string; code: string } | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const canVerify = selectedBank !== null && accountNumber.length === 10 && !verified;

  const filteredBanks = NIGERIAN_BANKS.filter(b =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  // Reset verification when inputs change
  useEffect(() => {
    setVerified(false);
    setAccountName('');
    setVerifyError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBank, accountNumber]);

  const handleVerify = useCallback(async () => {
    if (!canVerify) return;
    setVerifying(true);
    setVerifyError('');
    try {
      const verifyFn = functions().httpsCallable('verifyBankAccount');
      const result = await verifyFn({
        accountNumber,
        bankCode: selectedBank!.code,
      });
      const data = result.data as { accountName: string; verified: boolean };
      setAccountName(data.accountName);
      setVerified(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Check account details.';
      setVerifyError(msg);
    } finally {
      setVerifying(false);
    }
  }, [canVerify, accountNumber, selectedBank]);

  const handleSave = useCallback(async () => {
    if (!uid || !verified || !selectedBank) return;
    setSaving(true);
    try {
      await firestore().collection('landlords').doc(uid).update({
        'bankAccount.bankName': selectedBank.name,
        'bankAccount.bankCode': selectedBank.code,
        'bankAccount.accountNumber': accountNumber,
        'bankAccount.accountName': accountName,
        'bankAccount.verified': true,
        'bankAccount.updatedAt': firestore.FieldValue.serverTimestamp(),
      });
      Alert.alert(
        'Bank Account Saved',
        `${selectedBank.name} account ending in ${accountNumber.slice(-4)} has been saved successfully.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Error', 'Failed to save bank account. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [uid, verified, selectedBank, accountNumber, accountName]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Account Setup</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>🏦</Text>
          <Text style={styles.infoText}>
            Your verified bank account is used for rent payout. Account name must match your registered name.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Bank selector */}
          <Text style={styles.label}>Bank Name</Text>
          <TouchableOpacity
            style={styles.bankSelector}
            onPress={() => setShowBankPicker(true)}
          >
            <Text style={[styles.bankSelectorText, !selectedBank && { color: TEXT_SECONDARY }]}>
              {selectedBank ? selectedBank.name : 'Select your bank'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Account number */}
          <Text style={[styles.label, { marginTop: 20 }]}>Account Number</Text>
          <TextInput
            style={styles.input}
            value={accountNumber}
            onChangeText={v => setAccountNumber(v.replace(/\D/g, '').slice(0, 10))}
            keyboardType="numeric"
            placeholder="10-digit account number"
            placeholderTextColor={TEXT_SECONDARY}
            maxLength={10}
          />
          <Text style={styles.inputHint}>{accountNumber.length}/10 digits</Text>

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyBtn, !canVerify && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={!canVerify || verifying}
          >
            {verifying ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify Account</Text>
            )}
          </TouchableOpacity>

          {/* Verification result */}
          {verified && (
            <View style={styles.verifiedResult}>
              <Text style={styles.verifiedIcon}>✓</Text>
              <View>
                <Text style={styles.verifiedName}>{accountName}</Text>
                <Text style={styles.verifiedSub}>Account verified successfully</Text>
              </View>
            </View>
          )}

          {verifyError !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {verifyError}</Text>
            </View>
          )}

          {/* Save button */}
          {verified && (
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Bank Account</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Bank picker modal */}
      <Modal visible={showBankPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Bank</Text>
            <TouchableOpacity onPress={() => { setShowBankPicker(false); setBankSearch(''); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={bankSearch}
              onChangeText={setBankSearch}
              placeholder="Search banks..."
              placeholderTextColor={TEXT_SECONDARY}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredBanks}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.bankItem, selectedBank?.code === item.code && styles.bankItemSelected]}
                onPress={() => {
                  setSelectedBank(item);
                  setShowBankPicker(false);
                  setBankSearch('');
                }}
              >
                <Text style={[styles.bankItemText, selectedBank?.code === item.code && { color: PRIMARY, fontWeight: '700' }]}>
                  {item.name}
                </Text>
                {selectedBank?.code === item.code && (
                  <Text style={{ color: PRIMARY, fontSize: 18 }}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: BORDER }} />}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
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

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: PRIMARY_LIGHT,
    margin: 16,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  infoIcon: { fontSize: 20 },
  infoText: { flex: 1, fontSize: 13, color: SUCCESS, lineHeight: 20 },

  form: { paddingHorizontal: 16, paddingBottom: 40 },

  label: { fontSize: 13, fontWeight: '700', color: TEXT_COLOR, marginBottom: 8 },

  bankSelector: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankSelectorText: { fontSize: 15, color: TEXT_COLOR },
  chevron: { fontSize: 22, color: TEXT_SECONDARY },

  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: TEXT_COLOR,
  },
  inputHint: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 4, textAlign: 'right' },

  verifyBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  verifyBtnDisabled: { backgroundColor: '#A5D6A7' },
  verifyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  verifiedResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  verifiedIcon: { fontSize: 22, color: SUCCESS, fontWeight: '800' },
  verifiedName: { fontSize: 15, fontWeight: '700', color: SUCCESS },
  verifiedSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },

  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: ERROR,
  },
  errorText: { fontSize: 13, color: ERROR },

  saveBtn: {
    backgroundColor: '#FF6F00',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: SURFACE },
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
  modalClose: { fontSize: 20, color: TEXT_SECONDARY, padding: 4 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    margin: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: TEXT_COLOR },

  bankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  bankItemSelected: { backgroundColor: PRIMARY_LIGHT },
  bankItemText: { fontSize: 15, color: TEXT_COLOR },
});
