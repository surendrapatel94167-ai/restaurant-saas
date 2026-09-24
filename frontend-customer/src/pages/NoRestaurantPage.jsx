export default function NoRestaurantPage() {
  return (
    <div className="min-h-screen bg-[#fbf7f4] flex flex-col items-center justify-center px-6 text-center">
      <span className="text-5xl mb-4">📷</span>
      <h1 className="text-xl font-bold text-ink-900">Scan a table QR code to get started</h1>
      <p className="text-gray-500 mt-2 text-sm max-w-xs">
        This app opens a restaurant's menu when you scan the QR code on your table — there's nothing to show without one.
      </p>
    </div>
  );
}
