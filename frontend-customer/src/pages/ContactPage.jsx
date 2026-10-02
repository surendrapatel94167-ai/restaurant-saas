import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ContactPage() {
  const { tenantSlug, tableId } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api.get(`/customer/${tenantSlug}/landing`).then(({ data }) => setInfo(data)).catch(() => setInfo({}));
  }, [tenantSlug]);

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-[#F7F8FA] px-4 pb-24">
      <header className="bg-gradient-to-r from-ink-950 to-brand-800 text-white p-5 sticky top-0 z-10 rounded-b-2xl shadow-lg flex items-center gap-3">
        <button onClick={() => navigate(`/menu/${tenantSlug}/${tableId}`)} className="text-lg">←</button>
        <h1 className="text-lg font-bold">Contact {info?.hotelName || ''}</h1>
      </header>

      <div className="mt-6 space-y-3">
        {info?.contactPhone && (
          <a href={`tel:${info.contactPhone}`} className="flex items-center gap-3 bg-white rounded-xl shadow-card p-4">
            <span className="text-2xl">📞</span>
            <div>
              <p className="text-xs text-gray-500">Call us</p>
              <p className="font-medium text-ink-900">{info.contactPhone}</p>
            </div>
          </a>
        )}
        {info?.address && (
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-card p-4">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-xs text-gray-500">Address</p>
              <p className="font-medium text-ink-900">{info.address}</p>
            </div>
          </div>
        )}
        {info?.instagramUrl && (
          <a href={info.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white rounded-xl shadow-card p-4">
            <span className="text-2xl">📸</span>
            <div>
              <p className="text-xs text-gray-500">Instagram</p>
              <p className="font-medium text-ink-900">Follow us</p>
            </div>
          </a>
        )}
        {info?.facebookUrl && (
          <a href={info.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white rounded-xl shadow-card p-4">
            <span className="text-2xl">📘</span>
            <div>
              <p className="text-xs text-gray-500">Facebook</p>
              <p className="font-medium text-ink-900">Follow us</p>
            </div>
          </a>
        )}
        {info && !info.contactPhone && !info.address && !info.instagramUrl && !info.facebookUrl && (
          <p className="text-center text-gray-500 mt-8">Contact details coming soon.</p>
        )}
      </div>
    </div>
  );
}
