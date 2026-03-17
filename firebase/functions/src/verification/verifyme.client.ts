import * as admin from 'firebase-admin';
import axios from 'axios';

const BASE_URL = 'https://api.verifyme.ng/v1';

function getApiKey(): string {
  const config = admin.app().options as Record<string, any>;
  // In production, use: functions.config().verifyme.api_key
  // For emulator/local testing, fall back to env
  return process.env.VERIFYME_API_KEY ?? config?.verifyme?.api_key ?? '';
}

export interface VerifyMeBvnResponse {
  status: boolean;
  message: string;
  data: {
    bvn: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    enrollmentBank?: string;
    enrollmentBranch?: string;
    image?: string;
    gender?: string;
    watchListed?: boolean;
    reference?: string;
  };
}

export interface VerifyMeNinResponse {
  status: boolean;
  message: string;
  data: {
    nin: string;
    firstname: string;
    surname: string;
    middlename?: string;
    birthdate?: string;
    mobile?: string;
    photo?: string;
    gender?: string;
    reference?: string;
  };
}

export const VerifyMeClient = {
  /**
   * Verify a BVN and return identity data.
   * Caller must hash/redact the raw BVN before storing.
   */
  async verifyBvn(bvn: string): Promise<VerifyMeBvnResponse> {
    const response = await axios.get<VerifyMeBvnResponse>(
      `${BASE_URL}/verifications/bvn/${bvn}`,
      {
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    return response.data;
  },

  /**
   * Verify a NIN and return identity data.
   */
  async verifyNin(nin: string): Promise<VerifyMeNinResponse> {
    const response = await axios.get<VerifyMeNinResponse>(
      `${BASE_URL}/verifications/nin/${nin}`,
      {
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    return response.data;
  },
};
