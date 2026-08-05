import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/Button";
import { StatusPage } from "@/components/ui/StatusPage";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Stranica nije pronađena",
  // A missing page should not be indexed, but the links on it are worth following.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="Greška 404"
      title="Ove stranice nema na ovoj adresi"
      actions={
        <>
          <ButtonLink href={ROUTES.home}>Naslovnica</ButtonLink>
          <ButtonLink href={ROUTES.news} variant="outline">
            Vijesti
          </ButtonLink>
        </>
      }
    >
      <p>
        Čini se da ste malo skrenuli s puta — događa se i najboljim
        hodočasnicima. Poveznica je vjerojatno zastarjela ili je stranica u
        međuvremenu premještena.
      </p>
      <p className="mt-4">
        Vratite se na naslovnicu ili pogledajte što je novo u župi.
      </p>
    </StatusPage>
  );
}
