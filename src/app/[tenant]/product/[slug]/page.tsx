
import { notFound } from 'next/navigation'
import { getMenu } from '@/lib/tenant/store'
import { formatPEN } from '@/lib/tenant/fukin-engine/pricing'
import ProductConfigurator from './configurator'

export const dynamic = 'force-dynamic'

export default async function ProductPage({ params }: { params: { tenant: string; slug: string } }) {
  const { tenant, slug } = params
  const products = await getMenu(tenant)
  const product = products.find((p) => p.slug === slug)
  if (!product || !product.active) notFound()
  return <ProductConfigurator product={product} />
}
