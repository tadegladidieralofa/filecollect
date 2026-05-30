"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Campaign, CampaignFileRequirement, Submission, Organization } from '@/lib/types';
import { exportToExcel, exportToPdf } from '@/lib/export-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, FileText, Users, BarChart3, Link as LinkIcon, Clock, CheckCircle2, Play, Archive, FileSpreadsheet, FileDown, Download } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { organizer } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [requirements, setRequirements] = useState<CampaignFileRequirement[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCampaignData(); }, [campaignId]);

  async function loadCampaignData() {
    const [campRes, reqRes, subRes, orgRes] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaignId).maybeSingle(),
      supabase.from('campaign_file_requirements').select('*').eq('campaign_id', campaignId).order('sort_order'),
      supabase.from('submissions').select('*, campaign_file_requirements(name), organizations(id, name)').eq('campaign_id', campaignId).order('created_at', { ascending: false }),
      supabase.from('organizations').select('*').order('name'),
    ]);
    setCampaign(campRes.data);
    setRequirements(reqRes.data || []);
    setSubmissions(subRes.data || []);
    setOrganizations(orgRes.data || []);
    setLoading(false);
  }

  async function updateCampaignStatus(status: 'draft' | 'active' | 'closed') {
    const { error } = await supabase.from('campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', campaignId);
    if (error) { toast.error('Failed to update status'); return; }
    setCampaign({ ...campaign!, status });
    toast.success(`Campaign ${status === 'active' ? 'activated' : status === 'closed' ? 'closed' : 'saved as draft'}`);
  }

  function copyShareLink() {
    navigator.clipboard.writeText(`${window.location.origin}/submit/${campaign!.share_token}`);
    toast.success('Share link copied to clipboard');
  }

  async function downloadAllAsZip() {
    toast.info('Preparing ZIP download...');
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    for (const sub of submissions) {
      if (sub.status === 'rejected') continue;
      const { data } = await supabase.storage.from('campaign-files').download(sub.file_path);
      if (data) {
        const orgName = (sub.organizations as any)?.name || 'anonymous';
        zip.file(`${orgName.replace(/[^a-zA-Z0-9]/g, '_')}/${sub.file_name}`, data);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign!.name.replace(/[^a-zA-Z0-9]/g, '_')}_files.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ZIP downloaded');
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!campaign) return <div className="text-center py-12"><p className="text-muted-foreground">Campaign not found</p></div>;

  const daysLeft = differenceInDays(new Date(campaign.deadline), new Date());
  const pendingSubs = submissions.filter(s => s.status === 'pending');
  const approvedSubs = submissions.filter(s => s.status === 'approved');
  const rejectedSubs = submissions.filter(s => s.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{campaign.name}</h1>
            <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'closed' ? 'secondary' : 'outline'}>{campaign.status}</Badge>
          </div>
          <p className="text-muted-foreground">{campaign.description}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />Deadline: {format(new Date(campaign.deadline), 'MMM d, yyyy HH:mm')}</span>
            <Badge variant={daysLeft <= 1 ? 'destructive' : daysLeft <= 3 ? 'default' : 'secondary'}>{daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {campaign.status === 'draft' && <Button onClick={() => updateCampaignStatus('active')} className="gap-2"><Play className="h-4 w-4" />Activate</Button>}
          {campaign.status === 'active' && <Button variant="outline" onClick={() => updateCampaignStatus('closed')} className="gap-2"><Archive className="h-4 w-4" />Close</Button>}
          <Button variant="outline" onClick={() => exportToExcel(campaign!, requirements, submissions, organizations)} disabled={submissions.length === 0} className="gap-2"><FileSpreadsheet className="h-4 w-4" />Excel</Button>
          <Button variant="outline" onClick={() => exportToPdf(campaign!, requirements, submissions, organizations)} disabled={submissions.length === 0} className="gap-2"><FileDown className="h-4 w-4" />PDF</Button>
          <Button variant="outline" onClick={copyShareLink} className="gap-2"><LinkIcon className="h-4 w-4" />Share Link</Button>
          <Button variant="outline" onClick={downloadAllAsZip} disabled={submissions.length === 0} className="gap-2"><Download className="h-4 w-4" />ZIP</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{submissions.length}</p><p className="text-xs text-muted-foreground">Total Files</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{approvedSubs.length}</p><p className="text-xs text-muted-foreground">Approved</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{pendingSubs.length}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{rejectedSubs.length}</p><p className="text-xs text-muted-foreground">Rejected</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Required Files</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {requirements.map((req) => {
              const reqSubs = submissions.filter(s => s.file_requirement_id === req.id);
              return (
                <div key={req.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{req.name}</p>
                      <p className="text-xs text-muted-foreground">{req.accepted_formats.join(', ').toUpperCase()} &middot; Max {req.max_size_mb}MB &middot; {req.is_required ? 'Required' : 'Optional'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{reqSubs.length} submitted</Badge>
                    <Badge variant={reqSubs.some(s => s.status === 'approved') ? 'default' : 'outline'}>{reqSubs.filter(s => s.status === 'approved').length} approved</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between"><CardTitle className="text-lg">Submissions by Organization</CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push(`/campaigns/${campaignId}/track`)} className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Detailed Tracking</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {organizations.map((org) => {
              const orgSubs = submissions.filter(s => s.organization_id === org.id);
              const reqMet = requirements.filter(r => r.is_required).every(r => orgSubs.some(s => s.file_requirement_id === r.id && s.status === 'approved'));
              return (
                <div key={org.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div><p className="text-sm font-medium">{org.name}</p><p className="text-xs text-muted-foreground">{org.contact_person} &middot; {orgSubs.length} files</p></div>
                  </div>
                  <Badge className={reqMet ? 'bg-green-600' : ''}>{reqMet ? 'Complete' : 'Incomplete'}</Badge>
                </div>
              );
            })}
            {organizations.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No organizations registered yet</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Submissions</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {submissions.slice(0, 10).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{sub.file_name}</p>
                    <p className="text-xs text-muted-foreground">{(sub.organizations as any)?.name || sub.submitted_by_name} &middot; {(sub.campaign_file_requirements as any)?.name} &middot; {format(new Date(sub.created_at), 'MMM d, HH:mm')}</p>
                  </div>
                </div>
                <Badge variant={sub.status === 'approved' ? 'default' : sub.status === 'rejected' ? 'destructive' : 'secondary'}>{sub.status}</Badge>
              </div>
            ))}
            {submissions.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No submissions yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
