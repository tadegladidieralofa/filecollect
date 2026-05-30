"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Campaign } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, FileText, Plus, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const router = useRouter();
  const { organizer } = useAuth();
  const [templates, setTemplates] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    const { data } = await supabase.from('campaigns').select('*, campaign_file_requirements(*)').eq('organizer_id', organizer!.id).eq('is_template', true).order('template_name');
    setTemplates(data || []);
    setLoading(false);
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Template deleted');
    loadTemplates();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-foreground">Templates</h1><p className="text-muted-foreground mt-1">Reusable campaign templates</p></div>
        <Button onClick={() => router.push('/campaigns/new')} className="gap-2"><Plus className="h-4 w-4" />New Template</Button>
      </div>
      {templates.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Copy className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground mb-4">No templates saved yet</p><p className="text-sm text-muted-foreground">Save a campaign as a template to reuse its file requirements</p></CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const reqs = (template as any).campaign_file_requirements || [];
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2"><Copy className="h-5 w-5 text-primary" /><CardTitle className="text-lg">{template.template_name || template.name}</CardTitle></div>
                    <Button variant="ghost" size="sm" onClick={() => deleteTemplate(template.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {template.description && <CardDescription className="line-clamp-2">{template.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {reqs.map((req: any) => (
                      <div key={req.id} className="flex items-center gap-2 text-sm">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{req.name}</span>
                        <Badge variant={req.is_required ? 'default' : 'outline'} className="text-xs">{req.is_required ? 'Req' : 'Opt'}</Badge>
                        <span className="text-xs text-muted-foreground">{req.accepted_formats.join(', ').toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => router.push('/campaigns/new')}><FolderOpen className="h-3.5 w-3.5" />Use Template</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
