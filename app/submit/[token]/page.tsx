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
import { FileText, CheckCircle2, AlertCircle, Building2, User, Lock, ShieldCheck } from 'lucide-react';
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

  // Étape 1 : établissement
  const [selectedEst, setSelectedEst] = useState<string>('');
  const [selectedEstName, setSelectedEstName] = useState<string>('');

  // Étape 2 : PIN
  const [pinInput, setPinInput] = useState<string>('');
  const [pinVerified, setPinVerified] = useState<boolean>(false);
  const [pinLoading, setPinLoading] = useState<boolean>(false);
  const [pinError, setPinError] = useState<boolean>(false);

  // Étape 3 : nom + upload
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

  function handleEstChange(val: string) {
    setSelectedEst(val);
    const est = establishments.find(e => e.id === val);
    setSelectedEstName(est?.name || '');
    // Réinitialiser PIN et uploads si on change d'établissement
    setPinInput('');
    setPinVerified(false);
    setPinError(false);
    setSubmitted({});
    setSubmitterName('');
  }

  async function verifyPin() {
    if (pinInput.trim().length !== 4) return;
    setPinLoading(true);
    setPinError(false);
    const { data } = await supabase
      .from('establishments')
      .select('id')
      .eq('id', selectedEst)
      .eq('pin_code', pinInput.trim())
      .maybeSingle();
    if (data) {
      setPinVerified(true);
      toast.success('Code PIN correct ✓');
    } else {
      setPinError(true);
      toast.error('Code PIN incorrect');
    }
    setPinLoading(false);
  }

  function validateFile(file: File, req: CampaignFileRequirement): string | null {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const validExts = req.accepted_formats.flatMap(f => FILE_EXTENSIONS[f] || []);
    if (!validExts.includes(ext)) return `Format invalide. Acceptés : ${req.accepted_formats.join(', ').toUpperCase()}`;
    if (file.size > req.max_size_mb * 1024 * 1024) return `Fichier trop grand. Max : ${req.max_size_mb}MB`;
    return null;
  }

  async function handleUpload(req: CampaignFileRequirement, file: File) {
    if (!selectedEst) { toast.error('Sélectionnez un établissement'); return; }
    if (!pinVerified) { toast.error('Vérifiez votre code PIN d\'abord'); return; }
    if (!submitterName.trim()) { toast.error('Entrez votre nom'); return; }
    const validationError = validateFile(file, req);
    if (validationError) { toast.error(validationError); return; }
    setUploading(prev => ({ ...prev, [req.id]: true }));
    const ext = file.name.split('.').pop();
    const filePath = `${campaign!.id}/${selectedEst}/${req.id}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('campaign-files').upload(filePath, file);
    if (uploadError) { toast.error('Échec de l\'upload'); setUploading(prev => ({ ...prev, [req.id]: false })); return; }
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
    if (subError) { toast.error('Erreur lors de l\'enregistrement'); setUploading(prev => ({ ...prev, [req.id]: false })); return; }
    toast.success(`${req.name} : envoyé avec succès`);
    setUploading(prev => ({ ...prev, [req.id]: false }));
    setSubmitted(prev => ({ ...prev, [req.id]: true }));
  }

  const canUpload = selectedEst !== '' && pinVerified && submitterName.trim() !== '';

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
          <h2 className="text-xl font-semibold mb-2">Campagne introuvable</h2>
          <p className="text-muted-foreground mb-4">Ce lien est invalide ou la campagne n'est plus active.</p>
          <Link href="/login"><Button variant="outline">Se connecter</Button></Link>
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
              {daysLeft > 0 ? `${daysLeft} jours restants` : 'Expiré'}
            </Badge>
            <span className="text-muted-foreground">Date limite : {format(new Date(campaign.deadline), 'dd MMM yyyy')}</span>
          </div>
        </div>

        {/* Étape 1 : Sélection de l'établissement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Étape 1 — Votre établissement
            </CardTitle>
            <CardDescription>Sélectionnez l'établissement que vous représentez</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedEst} onValueChange={handleEstChange}>
              <SelectTrigger>
                <SelectValue placeholder="— Choisir un établissement —" />
              </SelectTrigger>
              <SelectContent>
                {establishments.map(est => (
                  <SelectItem key={est.id} value={est.id}>{est.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Étape 2 : Code PIN */}
        {selectedEst && !pinVerified && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-primary" />
                Étape 2 — Code PIN
              </CardTitle>
              <CardDescription>
                Entrez le code PIN de <strong>{selectedEstName}</strong>.
                Ce code vous a été communiqué par l'organisateur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Code à 4 chiffres"
                value={pinInput}
                onChange={e => {
                  setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setPinError(false);
                }}
                onKeyDown={e => { if (e.key === 'Enter') verifyPin(); }}
                maxLength={4}
                inputMode="numeric"
                className={`text-center text-2xl tracking-widest font-bold ${pinError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {pinError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Code incorrect. Contactez votre organisateur.
                </p>
              )}
              <Button
                onClick={verifyPin}
                disabled={pinInput.length !== 4 || pinLoading}
                className="w-full"
              >
                {pinLoading ? 'Vérification...' : 'Confirmer le code PIN'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Badge de confirmation PIN */}
        {selectedEst && pinVerified && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            <ShieldCheck className="h-4 w-4" />
            <span><strong>{selectedEstName}</strong> — identité confirmée ✓</span>
          </div>
        )}

        {/* Étape 3 : Nom */}
        {selectedEst && pinVerified && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Étape 3 — Votre nom
              </CardTitle>
              <CardDescription>Nom de la personne qui soumet les fichiers</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Nom complet…"
                value={submitterName}
                onChange={e => setSubmitterName(e.target.value)}
              />
            </CardContent>
          </Card>
        )}

        {/* Étape 4 : Upload des fichiers */}
        {canUpload && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground px-1">Envoyez les fichiers demandés ci-dessous</p>
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
                            {req.is_required ? 'Obligatoire' : 'Optionnel'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Formats acceptés : {req.accepted_formats.map(f => FORMAT_OPTIONS.find(o => o.value === f)?.label || f).join(', ')}
                          {' · '}Max : {req.max_size_mb}MB
                        </p>
                      </div>
                    </div>
                    {isUploaded ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-medium">Fichier envoyé avec succès</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor={`file-${req.id}`} className="text-xs">Choisir un fichier</Label>
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
                            Envoi en cours…
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
          Propulsé par <span className="font-medium text-foreground">FileCollect</span>
        </div>
      </div>
    </div>
  );
}
