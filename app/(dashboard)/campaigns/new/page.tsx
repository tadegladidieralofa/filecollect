"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Campaign, CampaignFileRequirement, FORMAT_OPTIONS, FileRequirementInput } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Send, Save, Copy, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

export default function NewCampaignPage() {
  const router = useRouter();
  const { organizer } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [fileRequirements, setFileRequirements] = useState<FileRequirementInput[]>([
    { name: '', accepted_formats: ['pdf'], max_size_mb: 10, is_required: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Campaign[]>([]);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    const { data } = await supabase.from('campaigns').select('*, campaign_file_requirements(*)').eq('organizer_id', organizer!.id).eq('is_template', true).order('template_name');
    setTemplates(data || []);
  }

  function addFileRequirement() {
    setFileRequirements([...fileRequirements, { name: '', accepted_formats: ['pdf'], max_size_mb: 10, is_required: true }]);
  }

  function removeFileRequirement(index: number) {
    setFileRequirements(fileRequirements.filter((_, i) => i !== index));
  }

  function updateFileRequirement(index: number, field: keyof FileRequirementInput, value: any) {
    const updated = [...fileRequirements];
    updated[index] = { ...updated[index], [field]: value };
    setFileRequirements(updated);
  }

  function toggleFormat(index: number, format: string) {
    const current = fileRequirements[index].accepted_formats;
    const updated = current.includes(format) ? current.filter(f => f !== format) : [...current, format];
    if (updated.length > 0) updateFileRequirement(index, 'accepted_formats', updated);
  }

  async function applyTemplate(templateId: string) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    setName(template.name);
    setDescription(template.description);
    const reqs = (template as any).campaign_file_requirements || [];
    if (reqs.length > 0) setFileRequirements(reqs.map((r: CampaignFileRequirement) => ({ name: r.name, accepted_formats: r.accepted_formats, max_size_mb: r.max_size_mb, is_required: r.is_required })));
    toast.success('Template applied');
  }

  async function saveCampaign(status: 'draft' | 'active') {
    if (!name.trim()) { toast.error('Campaign name is required'); return; }
    if (!deadline) { toast.error('Deadline is required'); return; }
    if (fileRequirements.some(r => !r.name.trim())) { toast.error('All file requirements must have a name'); return; }
    setSaving(true);
    const { data: campaign, error: campError } = await supabase.from('campaigns').insert({
      organizer_id: organizer!.id, name, description, deadline: new Date(deadline).toISOString(), status,
    }).select().single();
    if (campError) { toast.error('Failed to create campaign'); setSaving(false); return; }
    const { error: reqsError } = await supabase.from('campaign_file_requirements').insert(
      fileRequirements.map((r, i) => ({ campaign_id: campaign.id, name: r.name, accepted_formats: r.accepted_formats, max_size_mb: r.max_size_mb, is_required: r.is_required, sort_order: i }))
    );
    if (reqsError) { toast.error('Failed to create file requirements'); setSaving(false); return; }
    toast.success(status === 'draft' ? 'Campaign saved as draft' : 'Campaign published');
    router.push(`/campaigns/${campaign.id}`);
  }

  async function saveAsTemplate() {
    if (!name.trim()) { toast.error('Template name is required'); return; }
    if (fileRequirements.some(r => !r.name.trim())) { toast.error('All file requirements must have a name'); return; }
    setSaving(true);
    const { data: campaign, error: campError } = await supabase.from('campaigns').insert({
      organizer_id: organizer!.id, name, description, deadline: new Date(deadline || Date.now() + 30 * 86400000).toISOString(), status: 'draft', is_template: true, template_name: name,
    }).select().single();
    if (campError) { toast.error('Failed to save template'); setSaving(false); return; }
    const { error: reqsError } = await supabase.from('campaign_file_requirements').insert(
      fileRequirements.map((r, i) => ({ campaign_id: campaign.id, name: r.name, accepted_formats: r.accepted_formats, max_size_mb: r.max_size_mb, is_required: r.is_required, sort_order: i }))
    );
    if (reqsError) { toast.error('Failed to save template requirements'); setSaving(false); return; }
    toast.success('Template saved');
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">New Campaign</h1>
        <p className="text-muted-foreground mt-1">Create a file collection campaign</p>
      </div>
      {templates.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Start from Template</CardTitle></CardHeader>
          <CardContent>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (<SelectItem key={t.id} value={t.id}><div className="flex items-center gap-2"><Copy className="h-3.5 w-3.5" />{t.template_name || t.name}</div></SelectItem>))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="name">Campaign Name</Label><Input id="name" placeholder="e.g., Annual Report Collection 2024" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" placeholder="Provide instructions for submitters..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="space-y-2"><Label htmlFor="deadline">Deadline</Label><Input id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between"><CardTitle>Required Files</CardTitle><Button variant="outline" size="sm" onClick={addFileRequirement} className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add File</Button></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fileRequirements.map((req, index) => (
            <div key={index} className="p-4 rounded-lg border border-border space-y-3 bg-muted/30">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2"><GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" /><span className="text-sm font-medium">File #{index + 1}</span></div>
                {fileRequirements.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeFileRequirement(index)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2"><Label className="text-xs">Name</Label><Input placeholder="e.g., Financial Report" value={req.name} onChange={(e) => updateFileRequirement(index, 'name', e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Accepted Formats</Label><div className="flex flex-wrap gap-1.5">{FORMAT_OPTIONS.map((fmt) => (<Badge key={fmt.value} variant={req.accepted_formats.includes(fmt.value) ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleFormat(index, fmt.value)}>{fmt.label}</Badge>))}</div></div>
                <div className="space-y-1.5"><Label className="text-xs">Max Size (MB)</Label><Input type="number" min={1} max={100} value={req.max_size_mb} onChange={(e) => updateFileRequirement(index, 'max_size_mb', parseInt(e.target.value) || 10)} /></div>
                <div className="flex items-center gap-2"><Switch checked={req.is_required} onCheckedChange={(checked) => updateFileRequirement(index, 'is_required', checked)} /><Label className="text-xs">{req.is_required ? 'Required' : 'Optional'}</Label></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={saveAsTemplate} disabled={saving} className="gap-2"><Copy className="h-4 w-4" />Save as Template</Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => saveCampaign('draft')} disabled={saving} className="gap-2"><Save className="h-4 w-4" />Save Draft</Button>
          <Button onClick={() => saveCampaign('active')} disabled={saving} className="gap-2"><Send className="h-4 w-4" />Publish</Button>
        </div>
      </div>
    </div>
  );
}
