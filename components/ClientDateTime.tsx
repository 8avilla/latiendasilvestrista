'use client';

import { useState, useEffect } from 'react';
import { formatDateTimeCO } from '@/lib/dates';

export function ClientDateTime({ date }: { date: string | Date }) {
  const [text, setText] = useState('');
  useEffect(() => {
    setText(formatDateTimeCO(date));
  }, [date]);
  return <>{text}</>;
}
