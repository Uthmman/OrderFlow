
export const firebaseConfig = {
  "projectId": "course-registration-cce07",
  "appId": "1:117088413094:web:3aa53a2afe004846f65b67",
  "apiKey": "AIzaSyCOTBiGBKbvXQYK1YE4tBVupjiPACDpN0Y",
  "authDomain": "course-registration-cce07.firebaseapp.com",
  "storageBucket": "course-registration-cce07.appspot.com",
  "measurementId": "",
  "messagingSenderId": "117088413094"
};

export const secondaryFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_API_KEY || "AIzaSyDOOFzcKHx0D04z6S1Fqq85l-gX_MuZHmw",
  authDomain: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_AUTH_DOMAIN || "studio-2408085976-b70c8.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_PROJECT_ID || "studio-2408085976-b70c8",
  storageBucket: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_STORAGE_BUCKET || "studio-2408085976-b70c8.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_MESSAGING_SENDER_ID || "829368331971",
  appId: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_APP_ID || "1:829368331971:web:237e77e3235fade8803c76"
};
