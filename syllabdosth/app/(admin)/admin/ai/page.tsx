import type { Metadata } from 'next';
import Link from 'next/link';
import { AiForm } from '@/components/admin/ai-form';
import { Flash, PageHeader } from '@/components/admin/ui';
import { getContent } from '@/lib/cms/content';

export const metadata: Metadata = { title: 'AI Assistant' };

export default async function AiPage() {
  const addons = await getContent<{ ai: { enabled: boolean; apiKey: string } }>('settings.addons');
  const ready = addons.ai.enabled && (addons.ai.apiKey || process.env.ANTHROPIC_API_KEY);
  return (
    <>
      <PageHeader title="AI Assistant" crumbs={[{ label: 'AI Assistant' }]} sub="Drafts course descriptions, blog posts, captions, replies and translations in the Syllabdosth voice." />
      {!ready && <Flash tone="orange">To switch it on, add an Anthropic API key in <Link href="/admin/settings/addons" className="underline">Addon → AI Assistant</Link>.</Flash>}
      <AiForm />
    </>
  );
}
