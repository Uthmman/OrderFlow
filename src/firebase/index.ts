
'use client';

// This file is now mostly a placeholder to prevent import errors.
// The app has been converted to use mock data instead of live Firebase services.

export * from './auth/use-user';

// You can define and export dummy functions or empty objects if other parts of the app
// expect them to exist, to avoid runtime errors.

export const useFirestore = () => {
    // console.log("useFirestore is a mock function. App is using local data.");
    return null;
}

export const useStorage = () => {
    // console.log("useStorage is a mock function. App is using local data.");
    return null;
}

export const useMemoFirebase = <T>(factory: () => T): T => {
    // This mock implementation simply calls the factory function.
    return factory();
}

export const useCollection = () => {
    return { data: [], loading: false, error: null };
}

export const useDoc = () => {
    return { data: null, loading: false, error: null };
}
