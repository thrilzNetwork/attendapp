import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Attenda Technologies | Miami',
  description: 'Attenda Technologies builds practical operating technology for hospitality, commerce and transportation — designed around how work actually happens. Based in Miami, operating across the U.S. and Latin America.',
};

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return children;
}