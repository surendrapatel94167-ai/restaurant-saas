// This is a multi-tenant PWA: the same customer app serves every restaurant.
// A single static manifest.json can't know which restaurant to open when the
// installed icon is tapped, so we swap the <link rel="manifest"> to a
// per-tenant Blob URL as soon as we know which restaurant the guest is on.
export function setManifestForTenant(tenantSlug) {
  if (!tenantSlug) return;
  try {
    const manifest = {
      name: 'Restaurant Menu & Ordering',
      short_name: 'Menu',
      description: 'Scan, order and pay right from your table.',
      start_url: `/menu/${tenantSlug}`,
      id: `/menu/${tenantSlug}`,
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#F7F8FA',
      theme_color: '#10151F',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    const previous = link.href;
    link.href = url;
    if (previous && previous.startsWith('blob:')) URL.revokeObjectURL(previous);
  } catch (err) {
    console.warn('Could not set per-tenant manifest:', err.message);
  }
}
