"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Campaign, CampaignFileRequirement, Submission, FORMAT_OPTIONS, ACCEPTED_MIME_TYPES, FILE_EXTENSIONS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function OrgSubmitPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const { organization } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [requirements, setRequirements] = useState<CampaignFileRequirement[]>([]);
  const [existingSubs, setExistingSubs] = useState<Submission[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [campaignId]);

  async function loadData() {
    const [campRes, reqRes, subRes] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaignId).eq('status', 'active').maybeSingle(),
      supabase.from('campaign_file_requirements').select('*').eq('campaign_id', campaignId).order('sort_order'),
      supabase.from('submissions').select('*, campaign_file_requirements(name)').eq('campaign_id', campaignId).eq('organization_id', organization!.id),
    ]);
    setCampaign(campRes.data);
    setRequirements(reqRes.data || []);
    setExistingSubs(subRes.data || []);
    setLoading(false);
  }

  function validateFile(file: File, req: CampaignFileRequirement): string | null {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const validExts = req.accepted_formats.flatMap(f => FILE_EXTENSIONS[f] || []);
    if (!validExts.includes(ext)) return `Invalid format. Accepted: ${req.accepted_formats.join(', ').toUpperCase()}`;
    if (file.size > req.max_size_mb * 1024 * 1024) return `File too large. Max: ${req.max_size_mb}MB`;
    return null;
  }

  async function handleUpload(req: CampaignFileRequirement, file: File) {
    const validationError = validateFile(file, req);
    if (validationError) { toast.error(validationError); return; }
    setUploading(prev => ({ ...prev, [req.id]: true }));
    const ext = file.name.split('.').pop();
    const filePath = `${campaignId}/${organization!.id}/${req.id}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('campaign-files').upload(filePath, file);
    if (uploadError) { toast.error('Upload failed'); setUploading(prev => ({ ...prev, [req.id]: false })); return; }
    const { error: subError } = await supabase.from('submissions').insert({
      campaign_id: campaignId, file_requirement_id: req.id, organization_id: organization!.id,
      submitted_by_name: organization!.contact_person, submitted_by_email: organization!.contact_email,
      file_name: file.name, file_path: filePath, file_size: file.size, file_type: ext, status: 'pending',
    });
    if (subError) { toast.error('Failed to record submission'); setUploading(prev => ({ ...prev, [req.id]: false })); return; }
    toast.success(`${req.name}: File uploaded`);
    setUploading(prev => ({ ...prev, [req.id]: false }));
    loadData();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!campaign) return <div className="text-center py-12"><AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Campaign no longer active</p></div>;

  const daysLeft = differenceInDays(new Date(campaign.deadline), new Date());
  const completedReqs = requirements.filter(r => !r.is_required || existingSubs.some(s => s.file_requirement_id === r.id));
  const progressPercent = requirements.length > 0 ? (completedReqs.length / requirements.length) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
        <p className="text-muted-foreground mt-1">{campaign.description}</p>
        <div className="flex items-center gap-3 mt-3 text-sm">
          <Badge variant={daysLeft <= 1 ? 'destructive' : daysLeft <= 3 ? 'default' : 'secondary'}>{daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}</Badge>
          <span className="text-muted-foreground">Deadline: {format(new Date(campaign.deadline), 'MMM d, yyyy')}</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="w-full bg-secondary rounded-full h-2"><div className="bg-primary rounded-full h-2 transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div>
          <p className="text-xs text-muted-foreground mt-2">{completedReqs.length} of {requirements.length} files submitted</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {requirements.map((req) => {
          const existing = existingSubs.find(s => s.file_requirement_id === req.id);
          const isUploading = uploading[req.id];
          return (
            <Card key={req.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2"><h3 className="font-medium">{req.name}</h3><Badge variant={req.is_required ? 'default' : 'outline'}>{req.is_required ? 'Required' : 'Optional'}</Badge></div>
                    <p className="text-xs text-muted-foreground mt-1">Accepted: {req.accepted_formats.map(f => FORMAT_OPTIONS.find(o => o.value === f)?.label || f).join(', ')} &middot; Max: {req.max_size_mb}MB</p>
                  </div>
                </div>
                {existing ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1"><p className="text-sm font-medium">{existing.file_name}</p><p className="text-xs text-muted-foreground">Uploaded {format(new Date(existing.created_at), 'MMM d, HH:mm')}</p></div>
                    <Badge variant={existing.status === 'approved' ? 'default' : existing.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {existing.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {existing.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {existing.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                      {existing.status}
                    </Badge>
                    {existing.status === 'rejected' && existing.rejection_reason && <p className="text-xs text-red-600 mt-1">{existing.rejection_reason}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor={`file-${req.id}`} className="text-xs">Upload file</Label>
                    <Input id={`file-${req.id}`} type="file" accept={req.accepted_formats.flatMap(f => ACCEPTED_MIME_TYPES[f] || []).join(',')}
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(req, file); }}
                      disabled={isUploading || daysLeft <= 0} />
                    {isUploading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="h-3 w-3 border border-primary border-t-transparent rounded-full animate-spin" />Uploading...</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
