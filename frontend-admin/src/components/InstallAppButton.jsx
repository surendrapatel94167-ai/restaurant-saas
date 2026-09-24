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
      type="button"
      onClick={handleInstall}
      className="mt-4 w-full border border-white/20 text-white/90 rounded-lg py-2.5 flex items-center justify-center gap-2 font-medium text-sm hover:bg-white/5 transition"
    >
      📲 Install this app
    </button>
  );
}
