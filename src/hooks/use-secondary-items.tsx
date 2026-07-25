'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getSecondaryFirestore } from '@/firebase/secondary';
import type { SecondaryItem } from '@/lib/types';

/**
 * Hook to fetch material items from the secondary catalog Firestore project.
 */
export function useSecondaryItems() {
  const [items, setItems] = useState<SecondaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
        const db = getSecondaryFirestore();
        // Assuming the collection name is 'items' in the secondary project
        const itemsRef = collection(db, 'items');
        const q = query(itemsRef, orderBy('name', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const results = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          })) as SecondaryItem[];
          setItems(results);
          setLoading(false);
        }, (error) => {
            console.error("Error fetching secondary items:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    } catch (error) {
        console.error("Could not initialize secondary firestore:", error);
        setLoading(false);
    }
  }, []);

  return { items, loading };
}
