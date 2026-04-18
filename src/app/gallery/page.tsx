import { GalleryPage } from "@/components/gallery/gallery-page";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GalleryRoute() {
  const initialPhotos = await repository.getGallery();
  return <GalleryPage initialPhotos={initialPhotos} />;
}
