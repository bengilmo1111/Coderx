import { notFound } from 'next/navigation';
import { ALL_LEVELS, getLevel } from '@/curriculum/levels';
import { PlayScreen } from './PlayScreen';

export function generateStaticParams() {
  return ALL_LEVELS.map((l) => ({ levelId: l.id }));
}

export default async function Page({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  // Only the id crosses the server/client boundary — a Level carries functions
  // (makeWorld, goal) which are not serialisable. PlayScreen looks it up itself.
  if (!getLevel(levelId)) notFound();
  return <PlayScreen levelId={levelId} />;
}
