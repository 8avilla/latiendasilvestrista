'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/sessionId';

export default function ProductViewTracker({ productId, productName, price }: {
  productId: string;
  productName: string;
  price: number;
}) {
  useEffect(() => {
    trackEvent('product_view', { productId, productName, price });
  }, [productId, productName, price]);
  return null;
}
