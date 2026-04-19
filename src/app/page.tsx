import { LandingPage } from "@/components/landing/landing-page";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [initialSnapshot, initialGallery] = await Promise.all([
    repository.getPublicSnapshot(),
    repository.getGallery(),
  ]);

  return (
    <LandingPage
      initialSnapshot={initialSnapshot}
      initialGallery={initialGallery}
    />
  );
}
