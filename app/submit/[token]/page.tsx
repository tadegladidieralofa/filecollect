"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Campaign, CampaignFileRequirement, FORMAT_OPTIONS, ACCEPTED_MIME_TYPES, FILE_EXTENSIONS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, CheckCircle2, AlertCircle, Building2, User } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

interface Establishment {
  id: string;
  name: string;
}

export default function AnonymousSubmitPage() {
  const params = useParams();
  const token = params.token as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [requirements, setRequirements] = useState<CampaignFileRequirement[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEst, setSelectedEst] = useState<string>('');
  const [submitterName, setSubmitterName] = useState<string>('');
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  useEffect(() => { loadData(); }, [token]);

  async function loadData() {
    const [campRes, estRes] = await Promise.all([
      supabase.from('campaigns').select('*').eq('share_token', token).eq('status', 'active').maybeSingle(),
      supabase.from('establishments').select('id, name').order('name'),
    ]);
    if (campRes.data) {
      setCampaign(campRes.data);
      const { data: reqData } = await supabase
        .from('campaign_file_requirements')
        .select('*')
        .eq('campaign_id', campRes.data.id)
        .order('sort_order');
      setRequirements(reqData || []);
    }
    setEstablishments(estRes.data || []);
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
    if (!selectedEst) { toast.error('Please select an establishment'); return; }
    if (!submitterName.trim()) { toast.error('Please enter your name'); return; }
    const validationError = validateFile(file, req);
    if (validationError) { toast.error(validationError); return; }
    setUploading(prev => ({ ...prev, [req.id]: true }));
    const ext = file.name.split('.').pop();
    const filePath = `${campaign!.id}/${selectedEst}/${req.id}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('campaign-files').upload(filePath, file);
    if (uploadError) { toast.error('Upload failed'); setUploading(prev => ({ ...prev, [req.id]: false })); return; }
    const { error: subError } = await supabase.from('submissions').insert({
      campaign_id: campaign!.id,
      file_requirement_id: req.id,
      establishment_id: selectedEst,
      submitted_by_name: submitterName.trim(),
      submitted_by_email: '',
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: ext,
      status: 'pending',
    });
    if (subError) { toast.error('Failed to record submission'); setUploading(prev => ({ ...prev, [req.id]: false })); return; }
    toast.success(`${req.name}: Uploaded successfully`);
    setUploading(prev => ({ ...prev, [req.id]: false }));
    setSubmitted(prev => ({ ...prev, [req.id]: true }));
  }

  const canUpload = selectedEst !== '' && submitterName.trim() !== '';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!campaign) return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Campaign Not Found</h2>
          <p className="text-muted-foreground mb-4">This upload link is invalid or the campaign is no longer active.</p>
          <Link href="/login"><Button variant="outline">Go to Login</Button></Link>
        </CardContent>
      </Card>
    </div>
  );

  const daysLeft = differenceInDays(new Date(campaign.deadline), new Date());

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">FileCollect</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
          {campaign.description && <p className="text-muted-foreground mt-1">{campaign.description}</p>}
          <div className="flex items-center justify-center gap-3 mt-3 text-sm">
            <Badge variant={daysLeft <= 1 ? 'destructive' : daysLeft <= 3 ? 'default' : 'secondary'}>
              {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
            </Badge>
            <span className="text-muted-foreground">Deadline: {format(new Date(campaign.deadline), 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Step 1: Establishment — shown first and most prominently */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Select Your Establishment
            </CardTitle>
            <CardDescription>Choose the establishment you are submitting on behalf of</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedEst} onValueChange={(val) => { setSelectedEst(val); setSubmitted({}); }}>
              <SelectTrigger>
                <SelectValue placeholder="— Select an establishment —" />
              </SelectTrigger>
              <SelectContent>
                {establishments.map(est => (
                  <SelectItem key={est.id} value={est.id}>{est.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Step 2: Name — appears after establishment is chosen */}
        {selectedEst && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Your Name
              </CardTitle>
              <CardDescription>Enter the name of the person submitting these files</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Full name…"
                value={submitterName}
                onChange={e => setSubmitterName(e.target.value)}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: File uploads — appears only when both fields are filled */}
        {canUpload && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground px-1">Upload required files below</p>
            {requirements.map((req) => {
              const isUploaded = submitted[req.id];
              const isUploading = uploading[req.id];
              return (
                <Card key={req.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{req.name}</h3>
                          <Badge variant={req.is_required ? 'default' : 'outline'}>
                            {req.is_required ? 'Required' : 'Optional'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Accepted: {req.accepted_formats.map(f => FORMAT_OPTIONS.find(o => o.value === f)?.label || f).join(', ')}
                          {' · '}Max: {req.max_size_mb}MB
                        </p>
                      </div>
                    </div>
                    {isUploaded ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-medium">File uploaded successfully</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor={`file-${req.id}`} className="text-xs">Choose file</Label>
                        <Input
                          id={`file-${req.id}`}
                          type="file"
                          accept={req.accepted_formats.flatMap(f => ACCEPTED_MIME_TYPES[f] || []).join(',')}
                          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(req, file); }}
                          disabled={isUploading || daysLeft <= 0}
                        />
                        {isUploading && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="h-3 w-3 border border-primary border-t-transparent rounded-full animate-spin" />
                            Uploading…
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground pt-4">
          Powered by <span className="font-medium text-foreground">FileCollect</span>
        </div>
      </div>
    </div>
  );
}
