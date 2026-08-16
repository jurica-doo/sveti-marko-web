import type { Metadata } from "next";

import { StorySection } from "@/components/about/StorySection";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAboutPage } from "@/lib/api";
import { imageUrl } from "@/lib/media";
import { richTextToPlain } from "@/lib/richtext";
import { ROUTES } from "@/lib/routes";
import { buildBreadcrumbJsonLd, buildSeoMetadata, serializeJsonLd } from "@/lib/seo";

export const revalidate = 60;

/**
 * Fallback photographs, used until the matching CMS field
 * (`church.image` / `patron.image` on the `about-page` global) has an upload
 * of its own — at which point that wins, see `StorySection`.
 */
const CHURCH_IMAGE = "/sveti-marko-unutrasnjost-sa-strane.jpg";
const PATRON_IMAGE = "/sveti-marko-kip.jpg";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getAboutPage().catch(() => null);

  return buildSeoMetadata({
    title: page?.metaTitle || page?.title || "O nama",
    description:
      page?.metaDescription || page?.intro || richTextToPlain(page?.parish?.body),
    path: ROUTES.about,
    imageUrl: imageUrl(page?.heroImage),
  });
}

export default async function AboutPage() {
  const page = await getAboutPage();

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "Naslovnica", href: ROUTES.home },
    { name: page.title, href: ROUTES.about },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <PageHeader
        eyebrow={page.eyebrow}
        title={page.title}
        intro={page.intro}
        image={page.heroImage}
        breadcrumb={[{ label: "O nama", href: ROUTES.about }]}
      />

      <StorySection
        eyebrow="Župna zajednica"
        title={page.parish?.title}
        body={page.parish?.body}
        image={page.parish?.image}
      />

      <StorySection
        eyebrow="Crkva"
        title={page.church?.title || "Crkva svetog Marka"}
        body={page.church?.body}
        image={page.church?.image || CHURCH_IMAGE}
        flip
        tone="muted"
      />

      <StorySection
        eyebrow="Nebeski zaštitnik"
        title={page.patron?.title}
        meta={page.patron?.feastDay ? `Blagdan · ${page.patron.feastDay}` : null}
        body={page.patron?.body}
        image={page.patron?.image || PATRON_IMAGE}
      />
    </>
  );
}
