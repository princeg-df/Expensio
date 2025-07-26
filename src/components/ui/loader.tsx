
import { CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoaderProps = {
  className?: string;
  iconClassName?: string;
};

export function Loader({ className, iconClassName }: LoaderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <CircleDollarSign className={cn("loader-icon h-16 w-16", iconClassName)} />
    </div>
  );
}
