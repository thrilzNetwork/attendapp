import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';
import { assertSafePublicUrl } from '@/lib/ssrf';

export async function POST(req: NextRequest) {
  try {
    // Require API key
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Origin check
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    if (!isAllowedOrigin(origin, referer)) {
      return originBlocked();
    }

    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });

    // Block SSRF: only allow public http(s) targets, never internal addresses.
    let safeUrl: URL;
    try {
      safeUrl = await assertSafePublicUrl(url);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }

    // Fetch website HTML
    const res = await fetch(safeUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AttendaBot/1.0; +https://attenda.app)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return NextResponse.json({ error: `Website returned ${res.status}` }, { status: 502 });

    const html = await res.text();
    const $ = cheerio.load(html);

    // ── Extract from meta tags ─────────────────────
    const name = $('meta[property="og:site_name"]').attr('content')
      || $('meta[name="twitter:title"]').attr('content')
      || $('title').text().trim()
      || '';

    const description = $('meta[name="description"]').attr('content')
      || $('meta[property="og:description"]').attr('content')
      || '';

    // ── Extract from JSON-LD structured data ───────
    let address = '';
    let phone = '';
    let geo = { lat: 0, lng: 0 };

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '');
        const ld = Array.isArray(json) ? json[0] : json;
        if (!ld) return;

        // Hotel / LocalBusiness schema
        if (ld['@type'] === 'Hotel' || ld['@type'] === 'LocalBusiness' || ld['@type'] === 'Organization') {
          if (ld.address) {
            const a = ld.address;
            address = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode]
              .filter(Boolean).join(', ');
          }
          if (ld.telephone) phone = ld.telephone;
          if (ld.geo) geo = { lat: ld.geo.latitude || 0, lng: ld.geo.longitude || 0 };
        }
      } catch { /* skip malformed JSON */ }
    });

    // ── Extract from visible text ──────────────────
    if (!phone) {
      const phoneMatch = html.match(/(?:tel:|phone|call)(?:[^>]*>)?[\s:]*\+?[\d\s\-().]{7,20}/i);
      if (phoneMatch?.[0]) {
        phone = phoneMatch[0].replace(/.*?(\+?[\d\s\-().]{7,20})$/, '$1').trim();
      }
    }

    // ── Find review URLs ───────────────────────────
    let googleReviewUrl = '';
    let tripadvisorUrl = '';
    let yelpUrl = '';

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (!googleReviewUrl && (href.includes('google.com/maps') || href.includes('search?q=') || href.includes('google.com/travel'))) {
        googleReviewUrl = href;
      }
      if (!tripadvisorUrl && href.includes('tripadvisor.')) {
        tripadvisorUrl = href;
      }
      if (!yelpUrl && href.includes('yelp.')) {
        yelpUrl = href;
      }
    });

    // ── Build OSM fallback search for address ─────
    if (!address && name) {
      // Don't hit external API here — return what we have
      // The caller can use places-sync with the name later
    }

    return NextResponse.json({
      name: name || null,
      description: description || null,
      address: address || null,
      phone: phone || null,
      geo,
      googleReviewUrl: googleReviewUrl || null,
      tripadvisorUrl: tripadvisorUrl || null,
      yelpUrl: yelpUrl || null,
    });
  } catch (e) {
    console.error('Scrape error:', e);
    return NextResponse.json({ error: 'Failed to scrape website' }, { status: 500 });
  }
}
