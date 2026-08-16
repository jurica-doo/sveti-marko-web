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
 * Fallback photographs, used until the matching CMS field on the
 * `about-page` global has an upload of its own — at which point that wins,
 * see `StorySection`.
 *
 * The statue portrait sits in the parish section rather than under its own
 * "Nebeski zaštitnik" heading — that section has been dropped from the page.
 * Its title/feastDay/body still live in the CMS `patron` group untouched, so
 * bringing it back later is just adding the `StorySection` call again.
 */
const CHURCH_IMAGE = "/sveti-marko-unutrasnjost-sa-strane.jpg";
const PARISH_IMAGE = "/sveti-marko-kip.jpg";

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
        image={page.parish?.image || PARISH_IMAGE}
        imageOrientation="portrait"
      />

      <StorySection
        eyebrow="Crkva"
        title={page.church?.title || "Crkva svetog Marka"}
        body={page.church?.body}
        image={page.church?.image || CHURCH_IMAGE}
        flip
        tone="muted"
      />
    </>
  );
}
