
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, LogOut } from 'lucide-react';
import type { Group } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

type GroupCardProps = {
  group: Group;
  onLeave: () => void;
};

export function GroupCard({ group, onLeave }: GroupCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>{group.name}</CardTitle>
          <CardDescription>
            {group.members.length} Member{group.members.length > 1 ? 's' : ''}
          </CardDescription>
        </div>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onLeave} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Leave Group
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Can add a summary of expenses here in the future */}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/splitease/${group.id}`}>
            View Group <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
