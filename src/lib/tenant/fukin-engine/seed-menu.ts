// Seed menu for newly provisioned tenants — fukin template, cookie shop demo.
// Admin edits/adds everything in /<slug>/admin after provisioning.
import type { Product } from '../types'
import { GLASEADO, RELLENO, EXTRAS } from './menu'

export const COOKIE_SEED_MENU: Product[] = [
  { slug: 'caja-6-clasicas', name: 'CAJA 6 CLÁSICAS', short: '6 cookies a elección en caja kraft',
      long: '6 cookies a elección en caja kraft', price: 6000, category: 'Cajas', image: '/images/t/cookies-at-midnight/caja-6-clasicas.jpg', active: true, featured: true, proteinVerified: true, sortOrder: 1, groups: [] },
  { slug: 'caja-12-fiesta', name: 'CAJA 12 FIESTA', short: '12 cookies surtidas para compartir',
      long: '12 cookies surtidas para compartir', price: 11000, category: 'Cajas', image: '/images/t/cookies-at-midnight/caja-12-fiesta.jpg', active: true, featured: true, proteinVerified: true, sortOrder: 2, groups: [] },
  { slug: 'chips', name: 'CHIPS', short: 'Clásica con chips de chocolate',
      long: 'Clásica con chips de chocolate', price: 1200, category: 'Cookies', image: '/images/t/cookies-at-midnight/chips.jpg', featured: false, active: true, proteinVerified: true, sortOrder: 10, groups: [GLASEADO, EXTRAS] },
  { slug: 'doble-chocolate', name: 'DOBLE CHOCOLATE', short: 'Cacao + chips, intenso',
      long: 'Cacao + chips, intenso', price: 1300, category: 'Cookies', image: '/images/t/cookies-at-midnight/doble-chocolate.jpg', featured: false, active: true, proteinVerified: true, sortOrder: 11, groups: [GLASEADO, EXTRAS] },
  { slug: 'avena-miel', name: 'AVENA Y MIEL', short: 'Avena orgánica y miel pura',
      long: 'Avena orgánica y miel pura', price: 1200, category: 'Cookies', image: '/images/t/cookies-at-midnight/avena-miel.jpg', featured: false, active: true, proteinVerified: true, sortOrder: 12, groups: [GLASEADO, EXTRAS] },
  { slug: 'mani', name: 'MANÍ', short: 'Maní tostado, sal marina',
      long: 'Maní tostado, sal marina', price: 1300, category: 'Cookies', image: '/images/t/cookies-at-midnight/mani.jpg', featured: false, active: true, proteinVerified: true, sortOrder: 13, groups: [GLASEADO, EXTRAS] },
  { slug: 'rellena-dulce-leche', name: 'RELLENA DULCE DE LECHE', short: 'Relleno de dulce de leche',
      long: 'Relleno de dulce de leche', price: 1500, category: 'Cookies', image: '/images/t/cookies-at-midnight/rellena-dulce-leche.jpg', featured: false, active: true, proteinVerified: true, sortOrder: 14, groups: [EXTRAS] },
  { slug: 'brownie', name: 'BROWNIE', short: 'Doble chocolate, centro húmedo',
      long: 'Doble chocolate, centro húmedo', price: 1400, category: 'Cookies', image: '/images/t/cookies-at-midnight/brownie.jpg', featured: false, active: true, proteinVerified: true, sortOrder: 15, groups: [EXTRAS] },
  { slug: 'leche-coco', name: 'LECHE DE COCO', short: 'Fría, 300ml',
      long: 'Fría, 300ml', price: 800, category: 'Bebidas', image: '/images/t/cookies-at-midnight/leche-coco.jpg', featured: false, active: true, proteinVerified: true, sortOrder: 20, groups: [] },
  { slug: 'cold-brew', name: 'COLD BREW', short: 'Café frío, 12h de infusión',
      long: 'Café frío, 12h de infusión', price: 1000, category: 'Bebidas', image: '/images/t/cookies-at-midnight/cold-brew.jpg', featured: false, active: true, proteinVerified: true, sortOrder: 21, groups: [] },
]

export const SEED_ZONES = [
  { id: 'equipetrol', name: 'Equipetrol', fee: 10, minMinutes: 28, maxMinutes: 30, active: true },
  { id: 'monsenor-rivero', name: 'Monseñor Rivero', fee: 10, minMinutes: 33, maxMinutes: 35, active: true },
  { id: 'ventos', name: 'Ventos', fee: 12, minMinutes: 38, maxMinutes: 40, active: true },
  { id: 'urubo', name: 'Urubo', fee: 12, minMinutes: 43, maxMinutes: 45, active: true },
  { id: 'centro', name: 'Centro', fee: 8, minMinutes: 23, maxMinutes: 25, active: true },
]

export const SEED_ORDER_MIN = 30