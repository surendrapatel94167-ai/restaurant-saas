import { useEffect, useState } from 'react';
import { getInstallPrompt, isInstalled, onInstallPromptChange, triggerInstall } from '../utils/installPrompt';

export default function InstallAppButton() {
  const [available, setAvailable] = useState(!!getInstallPrompt());

  useEffect(() => onInstallPromptChange((event) => setAvailable(!!event)), []);

  if (isInstalled() || !available) return null;

  const handleInstall = async () => {
    const accepted = await triggerInstall();
    if (accepted) setAvailable(false);
  };

  return (
    <button
      onClick={handleInstall}
      className="mt-4 w-full bg-white border border-brand-600 text-brand-700 rounded-xl p-3 flex items-center justify-center gap-2 font-medium text-sm hover:bg-brand-50 transition"
    >
      📲 Install this app on your phone
    </button>
  );
}
