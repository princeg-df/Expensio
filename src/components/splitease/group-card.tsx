
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, LogOut, Users } from 'lucide-react';
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
    <Card className="flex flex-col bg-card hover:-translate-y-1 transition-transform duration-300 ease-in-out">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xl">{group.name}</CardTitle>
           <CardDescription className="flex items-center pt-1 gap-1.5">
            <Users className="h-4 w-4"/>
            {group.members.length} Member{group.members.length > 1 ? 's' : ''}
          </CardDescription>
        </div>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onLeave} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Leave Group
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Placeholder for future content like total expenses or member avatars */}
        <div className="text-sm text-muted-foreground">
          {/* Example: "Total expenses: ₹5,400" */}
        </div>
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
