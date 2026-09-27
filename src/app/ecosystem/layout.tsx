import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Attenda Ecosystem | One Company. One Connected Ecosystem.',
  description: 'Attenda Technologies builds Hospitality, Serve and Transportation — three products that stand alone and are designed to connect where workflows overlap.',
};

export default function EcosystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}