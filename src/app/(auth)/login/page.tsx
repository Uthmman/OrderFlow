
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is a placeholder. 
// The actual login form is now at the root / page.
// This page just redirects to root.
export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return null;
}
