import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <section className="shell flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">Greška 404</p>
      <h1 className="mt-6 max-w-xl text-[2.2rem] leading-tight text-ink-900 sm:text-[2.8rem]">
        Ova stranica nije pronađena
      </h1>
      <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-ink-500">
        Poveznica je možda zastarjela ili je stranica premještena. Vratite se na
        naslovnicu ili pogledajte župne vijesti.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <ButtonLink href={ROUTES.home}>Naslovnica</ButtonLink>
        <ButtonLink href={ROUTES.news} variant="outline">
          Vijesti
        </ButtonLink>
      </div>
    </section>
  );
}
