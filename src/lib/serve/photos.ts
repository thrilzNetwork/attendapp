/* Attenda Serve — real product photos for demo stores.
   Wizard-created menu items get a real photo (Unsplash CDN, stable URLs)
   matched by keyword, so a fresh demo looks like a live restaurant.
   Official tenants upload their own photos in the menu editor. */

const PHOTO_BANK: { kw: RegExp; url: string }[] = [
  { kw: /pollo|chicken|broaster|brasa/i,   url: 'https://images.unsplash.com/photo-1626082927381-41f12e0f1d95?w=800&q=80&auto=format&fit=crop' },
  { kw: /arroz|rice|chaufa/i,              url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80&auto=format&fit=crop' },
  { kw: /burger|hamburgues|smash/i,        url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80&auto=format&fit=crop' },
  { kw: /pizza/i,                          url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80&auto=format&fit=crop' },
  { kw: /taco|burrito|quesadilla/i,        url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80&auto=format&fit=crop' },
  { kw: /pasta|spaghetti|fettuccine|lasana|lasagna/i, url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80&auto=format&fit=crop' },
  { kw: /sopa|soup|casuela|cazuela/i,      url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80&auto=format&fit=crop' },
  { kw: /papa|papita|papas|frita/i,        url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80&auto=format&fit=crop' },
  { kw: /ceviche|pescado|fish|camarone/i,  url: 'https://images.unsplash.com/photo-1580476262798-855cf619d3d9?w=800&q=80&auto=format&fit=crop' },
  { kw: /sandwich|sanguche|sánguche|pan\b/i, url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80&auto=format&fit=crop' },
  { kw: /ensalada|salad|verdura/i,         url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80&auto=format&fit=crop' },
  { kw: /torta|cake|pastel|cheesecake/i,   url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&auto=format&fit=crop' },
  { kw: /cupcake|queque|muffin/i,          url: 'https://images.unsplash.com/photo-1426869884541-df7117556757?w=800&q=80&auto=format&fit=crop' },
  { kw: /postre|dessert|flan|helado|brownie/i, url: 'https://images.unsplash.com/photo-1488477181943-164977038345?w=800&q=80&auto=format&fit=crop' },
  { kw: /pan|bread|croissant|empanada/i,   url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&auto=format&fit=crop' },
  { kw: /cafe|café|coffee|latte|capuchino/i, url: 'https://images.unsplash.com/photo-1509042239860-ed550284f17b?w=800&q=80&auto=format&fit=crop' },
  { kw: /jugo|smoothie|licuado/i,          url: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800&q=80&auto=format&fit=crop' },
  { kw: /chicha|limonada|bebida|gaseosa|soda|refresco|te|té/i, url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80&auto=format&fit=crop' },
  { kw: /agua|water/i,                     url: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=800&q=80&auto=format&fit=crop' },
  { kw: /combo|menu|menú|especial/i,       url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&auto=format&fit=crop' },
  { kw: /lomo|saltado|res|beef|carne|seco/i, url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80&auto=format&fit=crop' },
  { kw: /cerdo|pork|chicharron|chicharrón|carnitas/i, url: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800&q=80&auto=format&fit=crop' },
];

/* Best-match photo for a product name; falls back to a generic plated dish. */
export function demoProductImage(name: string): string {
  for (const p of PHOTO_BANK) if (p.kw.test(name)) return p.url;
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&auto=format&fit=crop';
}