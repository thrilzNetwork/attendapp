import PitchClient from './client';

export default async function PitchPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <PitchClient apiKey={key} />;
}