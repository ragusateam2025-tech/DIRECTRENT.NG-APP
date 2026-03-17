/**
 * Lightweight mock for firebase-functions/v2 used in Jest unit tests.
 * The `https.onCall` wrapper just stores the handler so tests can call it directly.
 */

export const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

export const https = {
  onCall: jest.fn((_opts: unknown, handler: Function) => handler),
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'HttpsError';
    }
  },
};

export const firestore = {
  onDocumentCreated: jest.fn((_path: string, handler: Function) => handler),
  onDocumentUpdated: jest.fn((_path: string, handler: Function) => handler),
};
