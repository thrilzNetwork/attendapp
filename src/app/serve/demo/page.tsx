import type { Metadata } from 'next';
import ServeDemoBuilder from '@/components/serve/ServeDemoBuilder';

export const metadata: Metadata = {
  title: 'Attenda Serve — Crea tu demo gratis',
  description: 'Crea tu propio canal de ventas online en minutos. Página web, pedidos online y WhatsApp integrados — sin comisiones por venta.',
};

export default function ServeDemoPage() {
  return <ServeDemoBuilder />;
}