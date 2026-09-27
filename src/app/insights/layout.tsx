import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insights | Attenda Technologies',
  description: 'Articles, Field Notes, research and operator content from Attenda Technologies — written from the operation, not the lab.',
};

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return children;
}