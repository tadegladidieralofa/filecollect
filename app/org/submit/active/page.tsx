"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Campaign, Submission } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Upload, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function OrgActiveCampaignsPage() {
  const { organization } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [campRes, subRes] = await Promise.all([
      supabase.from('campaigns').select('*').eq('status', 'active').order('deadline'),
      supabase.from('submissions').select('*').eq('organization_id', organization!.id),
    ]);
    setCampaigns(campRes.data || []);
    setSubmissions(subRes.data || []);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground">Submit Files</h1><p className="text-muted-foreground mt-1">Active campaigns accepting submissions</p></div>
      {campaigns.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No active campaigns available</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const subs = submissions.filter(s => s.campaign_id === c.id);
            const daysLeft = differenceInDays(new Date(c.deadline), new Date());
            return (
              <Link key={c.id} href={`/org/submit/${c.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div><h3 className="text-lg font-semibold">{c.name}</h3><p className="text-sm text-muted-foreground mt-1">{c.description}</p></div>
                      <Badge variant={daysLeft <= 1 ? 'destructive' : daysLeft <= 3 ? 'default' : 'secondary'}>{daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" />{subs.length} files</span>
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Due {format(new Date(c.deadline), 'MMM d, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
