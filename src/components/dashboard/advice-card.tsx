import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb } from 'lucide-react';

type AdviceCardProps = {
  advice: { advice: string } | null;
  isLoading: boolean;
};

export function AdviceCard({ advice, isLoading }: AdviceCardProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (!advice) {
    return (
        <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg bg-muted/50 h-32">
            <Lightbulb className="h-8 w-8 text-muted-foreground mb-2"/>
            <p className="text-sm text-muted-foreground">Click &quot;Get Advice&quot; to see personalized tips.</p>
        </div>
    );
  }
  
  return (
    <Card className="bg-primary/10 border-primary/20">
      <CardContent className="p-4">
        <p className="text-sm text-foreground">{advice.advice}</p>
      </CardContent>
    </Card>
  );
}
