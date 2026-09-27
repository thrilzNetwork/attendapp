'use client';

/* Attenda Serve — /serve/demo/<id>/app layout: cart provider + FV chrome.
   Wraps all FV app surfaces (menu, product, cart, checkout, order). */

import { ReactNode } from 'react';
import { ServeCartProvider } from '@/components/serve/cart-context';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <ServeCartProvider>{children}</ServeCartProvider>;
}