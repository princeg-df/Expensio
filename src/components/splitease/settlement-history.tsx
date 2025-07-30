
'use client';

import type { GroupExpense, AppUser } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, ArrowRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SettlementHistoryProps = {
  settlements: GroupExpense[];
  members: AppUser[];
};

export function SettlementHistory({ settlements, members }: SettlementHistoryProps) {
  const getMember = (uid: string) => {
    return members.find(m => m.id === uid);
  };

  if (settlements.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card">
        <h3 className="text-lg font-semibold">No Settlements Yet</h3>
        <p className="text-muted-foreground mt-1 text-sm">Settle up a debt to see the history here.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {settlements.map(settlement => {
        const fromMember = getMember(settlement.paidBy);
        const toMember = getMember(settlement.splitWith[0].uid);
        
        return (
          <li key={settlement.id} className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
            <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="font-bold text-base">₹{settlement.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                        {format(settlement.date.toDate(), 'dd MMM, yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TooltipProvider>
                         <Tooltip>
                            <TooltipTrigger>
                               <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                        {fromMember?.name ? fromMember.name.charAt(0).toUpperCase() : <User className="h-3 w-3"/>}
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent><p>{fromMember?.name}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <span className="font-medium text-foreground truncate">{fromMember?.name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground truncate">{toMember?.name}</span>
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                        {toMember?.name ? toMember.name.charAt(0).toUpperCase() : <User className="h-3 w-3"/>}
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent><p>{toMember?.name}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
          </li>
        )
      })}
    </ul>
  );
}
