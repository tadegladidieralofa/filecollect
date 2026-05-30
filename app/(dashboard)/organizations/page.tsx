"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Search, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Establishment {
  id: string;
  name: string;
  contact_person: string | null;
  contact_email: string | null;
  phone: string | null;
  created_at: string;
}

export default function EstablishmentsPage() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Establishment | null>(null);
  const [form, setForm] = useState({ name: '', contact_person: '', contact_email: '', phone: '' });

  useEffect(() => { loadEstablishments(); }, []);

  async function loadEstablishments() {
    const { data } = await supabase.from('establishments').select('*').order('name');
    setEstablishments(data || []);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('Establishment name is required'); return; }
    if (editing) {
      const { error } = await supabase.from('establishments').update({ name: form.name, contact_person: form.contact_person, contact_email: form.contact_email, phone: form.phone }).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Establishment updated');
    } else {
      const { error } = await supabase.from('establishments').insert({ name: form.name, contact_person: form.contact_person, contact_email: form.contact_email, phone: form.phone });
      if (error) { toast.error('Failed to create: ' + error.message); return; }
      toast.success('Establishment created');
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: '', contact_person: '', contact_email: '', phone: '' });
    loadEstablishments();
  }

  function startEdit(est: Establishment) {
    setEditing(est);
    setForm({ name: est.name, contact_person: est.contact_person || '', contact_email: est.contact_email || '', phone: est.phone || '' });
    setDialogOpen(true);
  }

  async function deleteEst(est: Establishment) {
    if (!confirm(`Delete ${est.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from('establishments').delete().eq('id', est.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    loadEstablishments();
  }

  const filtered = establishments.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.contact_person?.toLowerCase().includes(search.toLowerCase()) || e.contact_email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-foreground">Establishments</h1><p className="text-muted-foreground mt-1">Manage establishments that submit files</p></div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setForm({ name: '', contact_person: '', contact_email: '', phone: '' }); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add Establishment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Establishment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Establishment Name</Label><Input placeholder="School, Company, Hospital..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Contact Person <span className="text-xs text-muted-foreground">(optional)</span></Label><Input placeholder="Full name" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email <span className="text-xs text-muted-foreground">(optional)</span></Label><Input type="email" placeholder="contact@establishment.com" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone <span className="text-xs text-muted-foreground">(optional)</span></Label><Input placeholder="+1 234 567 890" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <Button onClick={handleSubmit} className="w-full">{editing ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search establishments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Establishment</TableHead><TableHead>Contact Person</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((est) => (
              <TableRow key={est.id}>
                <TableCell><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{est.name}</span></div></TableCell>
                <TableCell>{est.contact_person || '-'}</TableCell>
                <TableCell>{est.contact_email || '-'}</TableCell>
                <TableCell>{est.phone || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(est)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteEst(est)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{search ? 'No establishments found' : 'No establishments yet'}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
