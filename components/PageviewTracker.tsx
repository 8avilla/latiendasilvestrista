'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/sessionId';

export default function PageviewTracker() {
  useEffect(() => {
    trackEvent('pageview');
  }, []);
  return null;
}
