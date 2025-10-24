
'use client';

import { FirebaseError } from 'firebase/app';

// The following is a simplified JSON representation of the Security Rules Request object.
// https://firebase.google.com/docs/reference/rules/rules.firestore.Request
export interface SecurityRuleRequest {
  auth: {
    uid: string;
    token: {
      [key: string]: any;
      email?: string;
      email_verified?: boolean;
      phone_number?: string;
      name?: string;
      sub: string;
      firebase: {
        identities: {
          [key: string]: any;
        };
        sign_in_provider: string;
        tenant?: string;
      };
    };
  } | null;
  method: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string; // The path of the affected resource
  resource?: {
    // Resource data is only available for write operations
    // https://firebase.google.com/docs/reference/rules/rules.firestore.Resource
    data: { [key: string]: any };
  };
  time: string; // ISO 8601 format
}

// The SecurityRuleContext is used to construct a FirestorePermissionError.
// The context is used to build a simulated SecurityRuleRequest object which is
// then used to provide a more detailed error message to the developer in the
// Next.js error overlay.
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

// This function builds a simulated SecurityRuleRequest object from the
// SecurityRuleContext. This is used to provide a more detailed error message
// to the developer in the Next.js error overlay.
function buildRequestObject(
  context: SecurityRuleContext
): SecurityRuleRequest {
  const { path, operation, requestResourceData } = context;

  // Since we are on the client, we can't know the exact auth state as it
  // will be evaluated by the security rules. We will simulate a null auth state
  // as a placeholder. In a real scenario, this would be populated by Firebase.
  const simulatedAuth = null;

  const requestObject: SecurityRuleRequest = {
    auth: simulatedAuth,
    method: operation,
    path: `/databases/(default)/documents${path.startsWith('/') ? '' : '/'}${path}`,
    time: new Date().toISOString(),
  };

  if (requestResourceData) {
    requestObject.resource = {
      data: requestResourceData,
    };
  }

  return requestObject;
}

// This function builds the error message for the FirestorePermissionError.
function buildErrorMessage(requestObject: SecurityRuleRequest): string {
  const baseMessage =
    'FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:';
  const requestJson = JSON.stringify(requestObject, null, 2);
  return `${baseMessage}\n${requestJson}`;
}

// Custom error class to represent a Firestore permission error.
export class FirestorePermissionError extends FirebaseError {
  public request: SecurityRuleRequest;

  constructor(context: SecurityRuleContext) {
    const requestObject = buildRequestObject(context);
    super('permission-denied', buildErrorMessage(requestObject));
    this.name = 'FirebaseError'; // To mimic a real Firebase error
    this.request = requestObject;
  }
}
