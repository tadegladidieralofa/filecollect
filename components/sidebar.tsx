"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LayoutDashboard, FolderOpen, Building2, Copy, LogOut, FileText, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function Sidebar() {
  const { role, signOut, organizer, organization } = useAuth();
  const pathname = usePathname();

  const organizerLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/campaigns/new', label: 'New Campaign', icon: FolderOpen },
    { href: '/organizations', label: 'Organizations', icon: Building2 },
    { href: '/templates', label: 'Templates', icon: Copy },
  ];

  const orgLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const links = role === 'organizer' ? organizerLinks : orgLinks;

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen flex flex-col">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">FileCollect</span>
        </Link>
      </div>
      <div className="px-4 mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {role === 'organizer' ? 'Organizer' : 'Organization'}
        </p>
        <p className="text-sm font-semibold text-foreground truncate">
          {role === 'organizer' ? organizer?.full_name : organization?.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {role === 'organizer' ? organizer?.email : organization?.contact_email}
        </p>
      </div>
      <Separator className="my-3" />
      <nav className="flex-1 px-3 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'));
          return (
            <Link key={link.href} href={link.href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}>
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
        {role === 'organization' && (
          <Link href="/org/submit/active"
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              pathname.startsWith('/org/submit') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}>
            <Upload className="h-4 w-4" />
            Submit Files
          </Link>
        )}
      </nav>
      <div className="p-4 mt-auto">
        <Separator className="mb-4" />
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
