
'use client';

import type { AppUser } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

type MembersListProps = {
  members: AppUser[];
};

export function MembersList({ members }: MembersListProps) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members found.</p>;
  }

  return (
    <div className="space-y-4">
      {members.map(member => (
        <div key={member.id} className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
                {member.name ? member.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{member.name}</span>
            <span className="text-xs text-muted-foreground">{member.email}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
