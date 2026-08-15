import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import {
  agreementFilename,
  tenancyAgreementHtml,
  type AgreementInput,
} from '../lib/tenancyAgreement';

/**
 * Turns an agreement into a PDF and hands it to the person who asked for it.
 *
 * Two steps and they fail differently, so they are reported differently. The
 * render happens on the device and either produces a file or does not. The
 * share opens whatever the phone has — Gmail, WhatsApp, Drive — and the user
 * may simply back out of that sheet, which is not a failure and must not be
 * reported as one.
 */

export class AgreementError extends Error {}

/**
 * Renders the agreement and returns the file's location.
 *
 * expo-print writes to a cache directory with a generated name, so the file is
 * immediately renamed to something a person can recognise in a downloads list
 * three weeks later. `Tenancy-Yaba-Chidi-Okafor.pdf` is findable;
 * `2f8c1e...pdf` is not.
 */
export async function renderAgreementPdf(input: AgreementInput): Promise<string> {
  const html = tenancyAgreementHtml(input);

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return uri;
  } catch (e: any) {
    throw new AgreementError(
      e?.message ?? 'The agreement could not be prepared. Please try again.',
    );
  }
}

/**
 * Renders the agreement and opens the share sheet.
 *
 * Returns false when there is nothing to share to — an emulator with no mail
 * or messaging app, mostly — so the caller can say so rather than appearing to
 * do nothing.
 */
export async function shareAgreement(input: AgreementInput): Promise<boolean> {
  const uri = await renderAgreementPdf(input);

  if (!(await Sharing.isAvailableAsync())) return false;

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    // Android shows this above the app list; iOS uses it as the subject when
    // the chosen target is mail.
    dialogTitle: agreementFilename(input.listing, input.tenant.name),
    UTI: 'com.adobe.pdf',
  });

  return true;
}

/**
 * Opens the system print dialog, which on Android also offers "Save as PDF".
 *
 * Offered alongside sharing because the two audiences differ: an owner emailing
 * a draft to their lawyer wants to share, and one taking a signed copy to a
 * tenant who does not use email wants to print. iOS has no equivalent entry
 * point worth showing, so callers hide it there.
 */
export async function printAgreement(input: AgreementInput): Promise<void> {
  if (Platform.OS === 'ios') {
    // printAsync exists on iOS too, but the file is already shareable and the
    // sheet there includes printing, so this would be a second door to the
    // same room.
    return;
  }

  try {
    await Print.printAsync({ html: tenancyAgreementHtml(input) });
  } catch (e: any) {
    // Dismissing the print dialog throws on Android. Backing out of a dialog
    // is not an error and must not be shown as one.
    const message = String(e?.message ?? '');
    if (/cancel|dismiss/i.test(message)) return;
    throw new AgreementError(message || 'The print dialog could not be opened.');
  }
}
