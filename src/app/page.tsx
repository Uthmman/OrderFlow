
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the loading state is resolved before redirecting
    if (!loading) {
      if (user) {
        // If user is authenticated, go to the dashboard
        router.push('/dashboard');
      } else {
        // If user is not authenticated, go to the login page
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Display a generic loading indicator while checking auth status
  return <div>Loading...</div>;
}
