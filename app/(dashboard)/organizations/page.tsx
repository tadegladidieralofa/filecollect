"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Search, Trash2, Edit, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Establishment {
  id: string;
  name: string;
  contact_person: string | null;
  contact_email: string | null;
  phone: string | null;
  pin_code: string | null;
  created_at: string;
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function EstablishmentsPage() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Establishment | null>(null);
  const [form, setForm] = useState({ name: '', contact_person: '', contact_email: '', phone: '', pin_code: '' });
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  useEffect(() => { loadEstablishments(); }, []);

  async function loadEstablishments() {
    const { data } = await supabase.from('establishments').select('*').order('name');
    setEstablishments(data || []);
  }

  function togglePin(id: string) {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function copyPin(pin: string, name: string) {
    navigator.clipboard.writeText(pin);
    toast.success(`Code PIN de ${name} copié !`);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('Le nom est obligatoire'); return; }
    const pin = form.pin_code.trim() || generatePin();
    if (editing) {
      const { error } = await supabase.from('establishments').update({
        name: form.name,
        contact_person: form.contact_person || null,
        contact_email: form.contact_email || null,
        phone: form.phone || null,
        pin_code: pin,
      }).eq('id', editing.id);
      if (error) { toast.error('Échec de la mise à jour'); return; }
      toast.success('Établissement mis à jour');
    } else {
      const { error } = await supabase.from('establishments').insert({
        name: form.name,
        contact_person: form.contact_person || null,
        contact_email: form.contact_email || null,
        phone: form.phone || null,
        pin_code: pin,
      });
      if (error) { toast.error('Échec de la création : ' + error.message); return; }
      toast.success('Établissement créé avec PIN : ' + pin);
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: '', contact_person: '', contact_email: '', phone: '', pin_code: '' });
    loadEstablishments();
  }

  async function regeneratePin(est: Establishment) {
    const newPin = generatePin();
    const { error } = await supabase.from('establishments').update({ pin_code: newPin }).eq('id', est.id);
    if (error) { toast.error('Échec'); return; }
    toast.success(`Nouveau PIN pour ${est.name} : ${newPin}`);
    loadEstablishments();
  }

  function startEdit(est: Establishment) {
    setEditing(est);
    setForm({
      name: est.name,
      contact_person: est.contact_person || '',
      contact_email: est.contact_email || '',
      phone: est.phone || '',
      pin_code: est.pin_code || '',
    });
    setDialogOpen(true);
  }

  async function deleteEst(est: Establishment) {
    if (!confirm(`Supprimer ${est.name} ? Cette action est irréversible.`)) return;
    const { error } = await supabase.from('establishments').delete().eq('id', est.id);
    if (error) { toast.error('Échec de la suppression'); return; }
    toast.success('Supprimé');
    loadEstablishments();
  }

  const filtered = establishments.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    e.contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Établissements</h1>
          <p className="text-muted-foreground mt-1">Gérez les établissements et leurs codes PIN</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { setEditing(null); setForm({ name: '', contact_person: '', contact_email: '', phone: '', pin_code: '' }); }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Modifier' : 'Ajouter'} un établissement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de l'établissement</Label>
                <Input placeholder="Lycée, Entreprise, Hôpital..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Personne responsable <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
                <Input placeholder="Nom complet" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
                <Input type="email" placeholder="contact@etablissement.com" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Téléphone <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
                <Input placeholder="+229 01 00 00 00" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Code PIN <span className="text-xs text-muted-foreground">(4 chiffres — généré auto si vide)</span></Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex : 4821"
                    value={form.pin_code}
                    onChange={(e) => setForm({ ...form, pin_code: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    maxLength={4}
                    inputMode="numeric"
                    className="text-center font-bold tracking-widest"
                  />
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, pin_code: generatePin() })}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editing ? 'Mettre à jour' : 'Créer'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Établissement</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Code PIN</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((est) => (
                <TableRow key={est.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{est.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{est.contact_person || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{est.contact_email || est.phone || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className={`font-mono font-bold text-sm ${visiblePins[est.id] ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {visiblePins[est.id] ? (est.pin_code || '????') : '••••'}
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => togglePin(est.id)}>
                        {visiblePins[est.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      {est.pin_code && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyPin(est.pin_code!, est.name)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => regeneratePin(est)} title="Nouveau PIN">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(est)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteEst(est)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {search ? 'Aucun résultat' : 'Aucun établissement pour l\'instant'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
