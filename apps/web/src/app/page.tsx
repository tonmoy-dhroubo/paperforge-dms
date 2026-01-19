'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const token = window.localStorage.getItem('paperforge.token');
    router.replace(token ? '/app' : '/login');
  }, [router]);

  return null;
}

