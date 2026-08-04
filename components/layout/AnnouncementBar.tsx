import { SmartLink } from "@/components/ui/SmartLink";
import type { SettingsType } from "@/lib/types";

/** Thin brass strip for one-off parish notices (blagdan, izvanredna misa…). */
export function AnnouncementBar({ settings }: { settings: SettingsType }) {
  const announcement = settings.announcement;
  if (!announcement?.enabled || !announcement.text) return null;

  const content = (
    <span className="text-[0.75rem] font-medium tracking-[0.04em]">
      {announcement.text}
    </span>
  );

  return (
    <div className="bg-ink-900 text-brass-100">
      <div className="shell flex min-h-9 items-center justify-center gap-2 py-2 text-center">
        {announcement.href ? (
          <SmartLink
            href={announcement.href}
            className="underline decoration-brass-500/60 underline-offset-4 transition-colors hover:text-stone-50"
          >
            {content}
          </SmartLink>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
