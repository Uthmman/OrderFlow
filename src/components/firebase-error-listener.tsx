'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // In a dev environment, we want to throw the error to show the Next.js overlay
      if (process.env.NODE_ENV === 'development') {
        // We throw it in a timeout to break out of the current render cycle
        setTimeout(() => {
          throw error;
        }, 0);
      } else {
        // In production, you might log this to a service like Sentry
        console.error(error);
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null; // This component doesn't render anything
}
