import LoadingSkeleton from './LoadingSkeleton';

type FieldSkeletonProps = {
  className?: string;
};

export default function FieldSkeleton({ className = '' }: FieldSkeletonProps) {
  return (
    <div className={`w-full rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className="mb-3 w-24">
        <LoadingSkeleton rows={1} height={10} rounded="rounded-full" />
      </div>
      <LoadingSkeleton rows={1} height={16} rounded="rounded-md" />
    </div>
  );
}
