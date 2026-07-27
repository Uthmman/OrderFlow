
'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Unsubscribe, addDoc } from 'firebase/firestore';
import { getSecondaryFirestore, ensureSecondaryAuth } from '@/firebase/secondary';
import type { SecondaryItem, SecondaryCategory } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook to fetch material items and categories from the secondary catalog Firestore project.
 */
export function useSecondaryItems() {
  const [items, setItems] = useState<SecondaryItem[]>([]);
  const [categories, setCategories] = useState<SecondaryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeItems: Unsubscribe;
    let unsubscribeCats: Unsubscribe;

    const initialize = async () => {
      try {
          // Ensure we have an auth context on the secondary project first
          await ensureSecondaryAuth();

          const db = getSecondaryFirestore();
          
          // Listen to items
          const itemsRef = collection(db, 'items');
          const qItems = query(itemsRef, orderBy('name', 'asc'));

          unsubscribeItems = onSnapshot(qItems, (snapshot) => {
            const results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SecondaryItem[];
            setItems(results);
            setLoading(false);
          }, (error) => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                operation: 'list',
                path: 'items',
              }));
              setLoading(false);
          });

          // Listen to categories
          const catsRef = collection(db, 'categories');
          const qCats = query(catsRef, orderBy('name', 'asc'));

          unsubscribeCats = onSnapshot(qCats, (snapshot) => {
              const results = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
              })) as SecondaryCategory[];
              setCategories(results);
          }, (error) => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                  operation: 'list',
                  path: 'categories',
              }));
          });

      } catch (error) {
          console.error("Could not initialize secondary firestore:", error);
          setLoading(false);
      }
    };

    initialize();
    
    return () => {
      if (unsubscribeItems) unsubscribeItems();
      if (unsubscribeCats) unsubscribeCats();
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

  return { items, categories, loading, addSecondaryItem };
}
