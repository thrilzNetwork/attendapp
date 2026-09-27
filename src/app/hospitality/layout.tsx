import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attenda Hospitality | Hotel Operations Technology',
  description: 'Attenda Hospitality is a hotel operations platform from Attenda Technologies — staff workflows, guest requests, housekeeping, maintenance, inspections, knowledge and operational visibility.',
};

export default function HospitalityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
