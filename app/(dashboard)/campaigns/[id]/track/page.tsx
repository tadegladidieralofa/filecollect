"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Campaign, CampaignFileRequirement, Submission, Organization } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BarChart3, CheckCircle2, XCircle, Clock, FileText, Users, Download, Building2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function TrackPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [requirements, setRequirements] = useState<CampaignFileRequirement[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingSubmission, setRejectingSubmission] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => { loadData(); }, [campaignId]);

  async function loadData() {
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

  async function approveSubmission(sub: Submission) {
    const { error } = await supabase.from('submissions').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', sub.id);
    if (error) { toast.error('Failed to approve'); return; }
    await supabase.from('notifications').insert({ campaign_id: campaignId, organization_id: sub.organization_id, recipient_email: sub.submitted_by_email, type: 'file_received' });
    setSubmissions(submissions.map(s => s.id === sub.id ? { ...s, status: 'approved' } : s));
    toast.success('File approved');
  }

  async function rejectSubmission() {
    if (!rejectingSubmission) return;
    const { error } = await supabase.from('submissions').update({ status: 'rejected', rejection_reason: rejectionReason, updated_at: new Date().toISOString() }).eq('id', rejectingSubmission.id);
    if (error) { toast.error('Failed to reject'); return; }
    await supabase.from('notifications').insert({ campaign_id: campaignId, organization_id: rejectingSubmission.organization_id, recipient_email: rejectingSubmission.submitted_by_email, type: 'file_rejected' });
    setSubmissions(submissions.map(s => s.id === rejectingSubmission.id ? { ...s, status: 'rejected', rejection_reason: rejectionReason } : s));
    setRejectDialogOpen(false);
    setRejectingSubmission(null);
    setRejectionReason('');
    toast.success('File rejected with notification');
  }

  async function downloadOrgFiles(orgId: string) {
    toast.info('Preparing download...');
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const orgSubs = submissions.filter(s => s.organization_id === orgId && s.status !== 'rejected');
    const org = organizations.find(o => o.id === orgId);
    for (const sub of orgSubs) {
      const { data } = await supabase.storage.from('campaign-files').download(sub.file_path);
      if (data) zip.file(sub.file_name, data);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(org?.name || 'files').replace(/[^a-zA-Z0-9]/g, '_')}_files.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded');
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const subByOrg = organizations.map(org => ({ org, submissions: submissions.filter(s => s.organization_id === org.id) }));
  const subByType = requirements.map(req => ({ requirement: req, submissions: submissions.filter(s => s.file_requirement_id === req.id) }));
  const subByPerson = Object.entries(submissions.reduce((acc, sub) => {
    if (!acc[sub.submitted_by_email]) acc[sub.submitted_by_email] = { name: sub.submitted_by_name, email: sub.submitted_by_email, submissions: [] };
    acc[sub.submitted_by_email].submissions.push(sub);
    return acc;
  }, {} as Record<string, { name: string; email: string; submissions: Submission[] }>));

  async function getFileUrl(filePath: string): Promise<string> {
    const { data } = await supabase.storage.from('campaign-files').createSignedUrl(filePath, 3600);
    return data?.signedUrl || '#';
  }

  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadUrls() {
      const urls: Record<string, string> = {};
      for (const sub of submissions) {
        const { data } = await supabase.storage.from('campaign-files').createSignedUrl(sub.file_path, 3600);
        if (data?.signedUrl) urls[sub.id] = data.signedUrl;
      }
      setFileUrls(urls);
    }
    if (submissions.length > 0) loadUrls();
  }, [submissions.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => history.back()}>Back</Button>
        <div><h1 className="text-2xl font-bold text-foreground">{campaign?.name} - Tracking</h1><p className="text-sm text-muted-foreground">Real-time submission tracking</p></div>
      </div>

      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Global</TabsTrigger>
          <TabsTrigger value="by-org" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />By Organization</TabsTrigger>
          <TabsTrigger value="by-type" className="gap-1.5"><FileText className="h-3.5 w-3.5" />By File Type</TabsTrigger>
          <TabsTrigger value="by-person" className="gap-1.5"><Users className="h-3.5 w-3.5" />By Person</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Organization</TableHead><TableHead>Submitted By</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.file_name}</TableCell>
                    <TableCell>{(sub.organizations as any)?.name || 'Anonymous'}</TableCell>
                    <TableCell>{sub.submitted_by_name}</TableCell>
                    <TableCell>{(sub.campaign_file_requirements as any)?.name}</TableCell>
                    <TableCell>{format(new Date(sub.created_at), 'MMM d, HH:mm')}</TableCell>
                    <TableCell><Badge variant={sub.status === 'approved' ? 'default' : sub.status === 'rejected' ? 'destructive' : 'secondary'}>{sub.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {sub.status === 'pending' && (<><Button size="sm" variant="outline" onClick={() => approveSubmission(sub)} className="h-7 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /></Button><Button size="sm" variant="outline" onClick={() => { setRejectingSubmission(sub); setRejectDialogOpen(true); }} className="h-7 text-red-600"><XCircle className="h-3.5 w-3.5" /></Button></>)}
                        <a href={fileUrls[sub.id] || '#'} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost" className="h-7"><Eye className="h-3.5 w-3.5" /></Button></a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {submissions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No submissions yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="by-org" className="mt-4 space-y-4">
          {subByOrg.map(({ org, submissions: orgSubs }) => {
            const completed = requirements.filter(r => r.is_required).every(r => orgSubs.some(s => s.file_requirement_id === r.id && s.status === 'approved'));
            return (
              <Card key={org.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-muted-foreground" /><CardTitle className="text-base">{org.name}</CardTitle><Badge variant={completed ? 'default' : 'secondary'}>{completed ? 'Complete' : 'Incomplete'}</Badge></div>
                    <Button variant="outline" size="sm" onClick={() => downloadOrgFiles(org.id)} className="gap-1.5"><Download className="h-3.5 w-3.5" />Download</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{org.contact_person} &middot; {org.contact_email}</p>
                </CardHeader>
                <CardContent>
                  {orgSubs.length === 0 ? <p className="text-sm text-muted-foreground py-2">No submissions yet</p> : (
                    <div className="divide-y">
                      {orgSubs.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{sub.file_name}</span><span className="text-xs text-muted-foreground">({(sub.campaign_file_requirements as any)?.name})</span></div>
                          <div className="flex items-center gap-2">
                            <Badge variant={sub.status === 'approved' ? 'default' : sub.status === 'rejected' ? 'destructive' : 'secondary'}>{sub.status}</Badge>
                            {sub.status === 'pending' && (<><Button size="sm" variant="outline" onClick={() => approveSubmission(sub)} className="h-6 px-2 text-xs text-green-600">Approve</Button><Button size="sm" variant="outline" onClick={() => { setRejectingSubmission(sub); setRejectDialogOpen(true); }} className="h-6 px-2 text-xs text-red-600">Reject</Button></>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="by-type" className="mt-4 space-y-4">
          {subByType.map(({ requirement, submissions: typeSubs }) => (
            <Card key={requirement.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-muted-foreground" /><CardTitle className="text-base">{requirement.name}</CardTitle><Badge variant="secondary">{typeSubs.length} / {organizations.length}</Badge><Badge variant={requirement.is_required ? 'default' : 'outline'}>{requirement.is_required ? 'Required' : 'Optional'}</Badge></div>
                <p className="text-xs text-muted-foreground">Accepted: {requirement.accepted_formats.join(', ').toUpperCase()} &middot; Max: {requirement.max_size_mb}MB</p>
              </CardHeader>
              <CardContent>
                {typeSubs.length === 0 ? <p className="text-sm text-muted-foreground py-2">No submissions for this requirement</p> : (
                  <div className="divide-y">
                    {typeSubs.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2"><span className="text-sm">{(sub.organizations as any)?.name || 'Anonymous'}</span><span className="text-xs text-muted-foreground">{sub.file_name}</span></div>
                        <div className="flex items-center gap-2">
                          <Badge variant={sub.status === 'approved' ? 'default' : sub.status === 'rejected' ? 'destructive' : 'secondary'}>{sub.status}</Badge>
                          {sub.status === 'pending' && (<><Button size="sm" variant="outline" onClick={() => approveSubmission(sub)} className="h-6 px-2 text-xs text-green-600">Approve</Button><Button size="sm" variant="outline" onClick={() => { setRejectingSubmission(sub); setRejectDialogOpen(true); }} className="h-6 px-2 text-xs text-red-600">Reject</Button></>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="by-person" className="mt-4 space-y-4">
          {subByPerson.map(([email, data]) => (
            <Card key={email}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><CardTitle className="text-base">{data.name}</CardTitle><span className="text-xs text-muted-foreground">{data.email}</span><Badge variant="secondary">{data.submissions.length} files</Badge></div>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {data.submissions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{sub.file_name}</span><span className="text-xs text-muted-foreground">({(sub.campaign_file_requirements as any)?.name})</span></div>
                      <Badge variant={sub.status === 'approved' ? 'default' : sub.status === 'rejected' ? 'destructive' : 'secondary'}>{sub.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {subByPerson.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No submissions yet</CardContent></Card>}
        </TabsContent>
      </Tabs>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject File</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Rejecting: <strong>{rejectingSubmission?.file_name}</strong></p>
            <div className="space-y-2"><Label>Rejection Reason</Label><Textarea placeholder="Explain why the file was rejected..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={rejectSubmission}>Reject & Notify</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
