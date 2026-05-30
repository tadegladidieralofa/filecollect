"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Upload, BarChart3, Bell, Shield, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">FileCollect</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-foreground mb-6">
            Collect Files from
            <br />
            <span className="text-primary">Organizations Effortlessly</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Create campaigns, define required documents, and track submissions in real time.
            Organizations upload securely. You stay in control.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-base px-8">
                Start Collecting
              </Button>
            </Link>
            <Link href="/register-org">
              <Button size="lg" variant="outline" className="text-base px-8">
                I&apos;m an Organization
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-3">Everything you need to manage file collection</h2>
          <p className="text-muted-foreground">From campaign creation to final report, all in one platform.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard icon={Upload} title="Smart Campaigns" description="Define required files with format restrictions, size limits, and deadlines. Share direct links for anonymous uploads." />
          <FeatureCard icon={BarChart3} title="Real-Time Tracking" description="Monitor submissions globally, by organization, by file type, or by person. Never lose track of what's missing." />
          <FeatureCard icon={Bell} title="Automated Reminders" description="Auto email reminders at 7, 3, and 1 day before deadline. Get notified when files arrive or are rejected." />
          <FeatureCard icon={Shield} title="Secure & Organized" description="File validation, rejection workflows, and organized storage. Download all files as ZIP or export detailed reports." />
          <FeatureCard icon={Users} title="Multi-Organization" description="Manage multiple organizations like schools or departments. Each has their own login and submission portal." />
          <FeatureCard icon={FileText} title="Templates & Reports" description="Save campaigns as reusable templates. Export comprehensive reports in PDF and Excel formats." />
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>FileCollect</span>
          </div>
          <p>Streamlined file collection for organizations</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow duration-300">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
