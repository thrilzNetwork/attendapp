import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attenda Transportation | Scheduling, Dispatch & Live Vehicle Operations',
  description: 'Attenda Transportation connects customers, properties, dispatchers and drivers through live scheduling, pickup coordination, vehicle visibility and operational communication.',
};

export default function TransportationLayout({ children }: { children: React.ReactNode }) {
  return children;
}