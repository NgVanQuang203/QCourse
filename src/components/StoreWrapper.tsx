'use client';

import { ReactNode } from 'react';
import { StoreProvider } from '@/lib/store';

export function StoreWrapper({ children }: { children: ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}
