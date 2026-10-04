import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ExplorationPreview,
  isVariant,
  isView,
  resolveState,
  variants,
  viewLabels,
  views,
} from '@/features/ui-exploration/client';

type Props = {
  params: Promise<{ variant: string; view: string }>;
  searchParams: Promise<{ state?: string | string[] }>;
};
export function generateStaticParams() {
  return variants.flatMap((variant) => views.map((view) => ({ variant: variant.id, view })));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { variant, view } = await params;
  return {
    title: isVariant(variant) && isView(view) ? `Ocean Editorial — ${viewLabels[view]}` : 'Mindy',
    robots: { index: false, follow: false },
  };
}
export default async function Page({ params, searchParams }: Props) {
  const { variant, view } = await params;
  if (!isVariant(variant) || !isView(view)) notFound();
  const query = await searchParams;
  const state = resolveState(typeof query.state === 'string' ? query.state : undefined, view);
  return <ExplorationPreview variant={variant} view={view} state={state} />;
}
