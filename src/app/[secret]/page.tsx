import { notFound } from "next/navigation";

import { AdminConsole } from "@/components/admin/admin-console";
import { ADMIN_ROUTE_SEGMENT } from "@/lib/config";
import { isAdminAuthorized } from "@/lib/auth/admin";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SecretAdminPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  if (secret !== ADMIN_ROUTE_SEGMENT) {
    notFound();
  }

  const authorized = await isAdminAuthorized();
  const snapshot = authorized ? await repository.getAdminSnapshot() : null;

  return <AdminConsole initialAuthorized={authorized} initialSnapshot={snapshot} />;
}
