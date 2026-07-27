
'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Unsubscribe, addDoc } from 'firebase/firestore';
import { getSecondaryFirestore, ensureSecondaryAuth } from '@/firebase/secondary';
import type { SecondaryItem } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook to fetch material items from the secondary catalog Firestore project.
 */
export function useSecondaryItems() {
  const [items, setItems] = useState<SecondaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: Unsubscribe;

    const initialize = async () => {
      try {
          // Ensure we have an auth context on the secondary project first
          await ensureSecondaryAuth();

          const db = getSecondaryFirestore();
          // Assuming the collection name is 'items' in the secondary project
          const itemsRef = collection(db, 'items');
          const q = query(itemsRef, orderBy('name', 'asc'));

          unsubscribe = onSnapshot(q, (snapshot) => {
            const results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SecondaryItem[];
            setItems(results);
            setLoading(false);
          }, (error) => {
              // Emitting specialized error instead of standard console.error
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                operation: 'list',
                path: 'items',
              }));
              setLoading(false);
          });
      } catch (error) {
          console.error("Could not initialize secondary firestore:", error);
          setLoading(false);
      }
    };

    initialize();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  /**
   * Adds a new item to the secondary material catalog.
   */
  const addSecondaryItem = async (item: Omit<SecondaryItem, 'id'>) => {
    try {
      await ensureSecondaryAuth();
      const db = getSecondaryFirestore();
      await addDoc(collection(db, 'items'), item);
      return true;
    } catch (error) {
      console.error("Failed to add item to secondary catalog:", error);
      return false;
    }
  };

  return { items, loading, addSecondaryItem };
}
