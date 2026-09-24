import QRCode from 'qrcode';

export async function generateTableQR(tenantSlug, tableId, baseUrl) {
  const url = `${baseUrl}/menu/${tenantSlug}/${tableId}`;
  const dataUrl = await QRCode.toDataURL(url);
  return { url, qrDataUrl: dataUrl };
}
