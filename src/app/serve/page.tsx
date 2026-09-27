import type { Metadata } from 'next';
import ServeLanding from '@/components/serve/ServeLanding';

export const metadata: Metadata = {
  title: 'Attenda Serve — El sistema operativo para el vendedor de todos los días',
  description:
    'Crea tu presencia online, recibe pedidos, cobra como trabaja tu mercado, organiza a tu equipo y haz que tus clientes vuelvan. Tu propio canal de ventas — no otro marketplace.',
  openGraph: {
    title: 'Attenda Serve — El sistema operativo para el vendedor de todos los días',
    description:
      'Tu negocio merece las mismas herramientas que los grandes. Crea tu tienda, recibe pedidos y haz que tus clientes vuelvan — todo desde un solo lugar.',
    type: 'website',
  },
};

export default function ServePage() {
  return <ServeLanding />;
}