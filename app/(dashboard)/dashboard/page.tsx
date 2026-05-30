"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Campaign, Submission, Organization } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Users, FileText, Clock, CheckCircle2, AlertCircle, Plus, ArrowRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function DashboardPage() {
  const { role, organizer, organization } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'organizer') loadOrganizerData();
    else if (role === 'organization') loadOrganizationData();
  }, [role]);

  async function loadOrganizerData() {
    const [campRes, subRes, orgRes] = await Promise.all([
      supabase.from('campaigns').select('*').eq('organizer_id', organizer!.id).eq('is_template', false).order('created_at', { ascending: false }),
      supabase.from('submissions').select('*, campaign_file_requirements(name), organizations(name)').order('created_at', { ascending: false }),
      supabase.from('organizations').select('*').order('name'),
    ]);
    setCampaigns(campRes.data || []);
    setSubmissions(subRes.data || []);
    setOrganizations(orgRes.data || []);
    setLoading(false);
  }

  async function loadOrganizationData() {
    const [subRes, campRes] = await Promise.all([
      supabase.from('submissions').select('*, campaign_file_requirements(name), campaigns(name, deadline, status)').eq('organization_id', organization!.id).order('created_at', { ascending: false }),
      supabase.from('campaigns').select('*').eq('status', 'active').order('deadline'),
    ]);
    setSubmissions(subRes.data || []);
    setCampaigns(campRes.data || []);
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (role === 'organization') {
    return <OrgDashboard campaigns={campaigns} submissions={submissions} />;
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your file collection campaigns</p>
        </div>
        <Link href="/campaigns/new"><Button className="gap-2"><Plus className="h-4 w-4" />New Campaign</Button></Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={FolderOpen} label="Active Campaigns" value={activeCampaigns.length} color="primary" />
        <StatCard icon={FileText} label="Total Submissions" value={submissions.length} color="accent" />
        <StatCard icon={Clock} label="Pending Review" value={pendingSubmissions.length} color="warning" />
        <StatCard icon={Users} label="Organizations" value={organizations.length} color="primary" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Active Campaigns</h2>
        </div>
        {activeCampaigns.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No active campaigns yet</p>
            <Link href="/campaigns/new"><Button>Create your first campaign</Button></Link>
          </CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCampaigns.map((campaign) => {
              const campSubs = submissions.filter(s => s.campaign_id === campaign.id);
              const daysLeft = differenceInDays(new Date(campaign.deadline), new Date());
              return (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <Badge variant={daysLeft <= 1 ? 'destructive' : daysLeft <= 3 ? 'default' : 'secondary'}>
                          {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><FileText className="h-3.5 w-3.5" />{campSubs.length} files</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />{campSubs.filter(s => s.status === 'approved').length} approved</span>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-1">Deadline: {format(new Date(campaign.deadline), 'MMM d, yyyy')}</div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${Math.min(100, (campSubs.filter(s => s.status === 'approved').length / Math.max(1, organizations.length)) * 100)}%` }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Recent Submissions</h2>
        {pendingSubmissions.length > 0 && (
          <Card className="mb-4 border-l-4 border-l-yellow-500">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium">{pendingSubmissions.length} submission{pendingSubmissions.length > 1 ? 's' : ''} awaiting review</span>
              <Link href={`/campaigns/${pendingSubmissions[0]?.campaign_id}/track`}>
                <Button variant="outline" size="sm" className="ml-auto gap-1">Review <ArrowRight className="h-3 w-3" /></Button>
              </Link>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {submissions.slice(0, 5).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{sub.file_name}</p>
                      <p className="text-xs text-muted-foreground">{(sub.organizations as any)?.name || sub.submitted_by_name} &middot; {(sub.campaign_file_requirements as any)?.name}</p>
                    </div>
                  </div>
                  <Badge variant={sub.status === 'approved' ? 'default' : sub.status === 'rejected' ? 'destructive' : 'secondary'}>{sub.status}</Badge>
                </div>
              ))}
              {submissions.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No submissions yet</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrgDashboard({ campaigns, submissions }: { campaigns: Campaign[]; submissions: Submission[] }) {
  const pending = submissions.filter(s => s.status === 'pending');
  const approved = submissions.filter(s => s.status === 'approved');
  const rejected = submissions.filter(s => s.status === 'rejected');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your file submissions overview</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Clock} label="Pending" value={pending.length} color="warning" />
        <StatCard icon={CheckCircle2} label="Approved" value={approved.length} color="primary" />
        <StatCard icon={AlertCircle} label="Rejected" value={rejected.length} color="destructive" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Active Campaigns</h2>
        {campaigns.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No active campaigns</p></CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {campaigns.map((c) => {
              const subs = submissions.filter(s => s.campaign_id === c.id);
              const daysLeft = differenceInDays(new Date(c.deadline), new Date());
              return (
                <Link key={c.id} href={`/org/submit/${c.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{c.name}</CardTitle>
                        <Badge variant={daysLeft <= 1 ? 'destructive' : daysLeft <= 3 ? 'default' : 'secondary'}>{daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{subs.length} files submitted</span>
                        <span>Deadline: {format(new Date(c.deadline), 'MMM d, yyyy')}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  const cls: Record<string, string> = { primary: 'bg-primary/10 text-primary', accent: 'bg-accent/10 text-accent', warning: 'bg-yellow-500/10 text-yellow-600', destructive: 'bg-destructive/10 text-destructive' };
  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${cls[color] || cls.primary}`}><Icon className="h-6 w-6" /></div>
        <div><p className="text-2xl font-bold text-foreground">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
      </div>
    </CardContent></Card>
  );
}
