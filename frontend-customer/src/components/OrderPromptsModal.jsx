import { useEffect, useState } from 'react';
import { getInstallPrompt, isInstalled, onInstallPromptChange, triggerInstall } from '../utils/installPrompt';
import { enablePushNotifications } from '../utils/pushNotifications';

export default function OrderPromptsModal({ tenantSlug, orderId, customerName, customerPhone }) {
  const [step, setStep] = useState(null); // 'notification' | 'install' | null
  const [installAvailable, setInstallAvailable] = useState(!!getInstallPrompt());

  useEffect(() => onInstallPromptChange((event) => setInstallAvailable(!!event)), []);

  useEffect(() => {
    if (!orderId) return;
    const seenKey = `orderPromptsShown:${orderId}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, '1');

    const notifNeeded = 'Notification' in window && Notification.permission === 'default';
    if (notifNeeded) setStep('notification');
    else if (installAvailable && !isInstalled()) setStep('install');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const goToInstallOrClose = () => {
    if (installAvailable && !isInstalled()) setStep('install');
    else setStep(null);
  };

  const handleAllowNotifications = async () => {
    await enablePushNotifications(tenantSlug, customerName, customerPhone);
    goToInstallOrClose();
  };

  const handleInstall = async () => {
    await triggerInstall();
    setStep(null);
  };

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 text-center">
        {step === 'notification' && (
          <>
            <span className="text-4xl">🔔</span>
            <h3 className="font-bold text-ink-900 text-lg mt-2 mb-1">Stay updated on your order</h3>
            <p className="text-sm text-gray-500 mb-4">Turn on notifications to know the moment your order is confirmed and ready — plus hear about future offers.</p>
            <div className="flex gap-2">
              <button onClick={goToInstallOrClose} className="flex-1 py-2.5 text-sm text-gray-500 font-medium rounded-lg hover:bg-gray-100">
                Not now
              </button>
              <button onClick={handleAllowNotifications} className="flex-1 py-2.5 text-sm text-white font-medium rounded-lg bg-brand-600 hover:bg-brand-700">
                Allow
              </button>
            </div>
          </>
        )}
        {step === 'install' && (
          <>
            <span className="text-4xl">📲</span>
            <h3 className="font-bold text-ink-900 text-lg mt-2 mb-1">Add to your home screen</h3>
            <p className="text-sm text-gray-500 mb-4">Install this app for faster ordering next time — no browser, no typing the link again.</p>
            <div className="flex gap-2">
              <button onClick={() => setStep(null)} className="flex-1 py-2.5 text-sm text-gray-500 font-medium rounded-lg hover:bg-gray-100">
                Not now
              </button>
              <button onClick={handleInstall} className="flex-1 py-2.5 text-sm text-white font-medium rounded-lg bg-brand-600 hover:bg-brand-700">
                Install
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
