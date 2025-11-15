'use client';

interface DeviceFrameProps {
  device: 'MOBILE' | 'DESKTOP';
  children: React.ReactNode;
}

export default function DeviceFrame({ device, children }: DeviceFrameProps) {
  return (
    <div className="w-full grid place-items-center">
      <div 
        className={`border border-gray-200 bg-gray-50 rounded-3xl p-4 shadow-[inset_0_0_0_2px_#fff] ${
          device === 'MOBILE' 
            ? 'w-[380px] max-w-[calc(100vw-32px)] rounded-[28px]' 
            : 'w-[1024px] max-w-[calc(100vw-32px)] rounded-xl'
        }`}
        aria-label={device === 'MOBILE' ? 'Mobile preview' : 'Desktop preview'}
      >
        <div className="bg-white rounded-xl min-h-[560px] p-3 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
