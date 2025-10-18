import { useAppStore } from '@/store/appStore';

export function InstrumentsTest() {
  const scanInProgress = useAppStore((state) => state.scanInProgress);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Instruments Test Page</h1>
      <p>If you can see this, the basic page works WITH Zustand.</p>
      <p>Scan in progress: {scanInProgress ? 'Yes' : 'No'}</p>
    </div>
  );
}
