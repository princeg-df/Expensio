
import { cn } from '@/lib/utils';

type LoaderProps = {
  className?: string;
  iconClassName?: string;
};

export function Loader({ className, iconClassName }: LoaderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("loader-icon", iconClassName)}>₹</div>
    </div>
  );
}
