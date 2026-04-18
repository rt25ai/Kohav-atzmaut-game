import { LandingPage } from "@/components/landing/landing-page";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialSnapshot = await repository.getPublicSnapshot();
  return <LandingPage initialSnapshot={initialSnapshot} />;
}
