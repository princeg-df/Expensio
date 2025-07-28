
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function SplitEasePage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SplitEase</h1>
          <p className="text-muted-foreground">
            Create groups, add expenses, and split bills with friends.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Groups</CardTitle>
          <CardDescription>
            Here are all the groups you are a part of.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20">
            <p className="text-muted-foreground">You are not in any groups yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
