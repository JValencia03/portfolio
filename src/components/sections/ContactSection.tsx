"use client";

import { ArrowUpRight } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";
import { profile } from "@/data/profile";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SectionShell } from "./SectionShell";

const CHANNELS = ["email", "github", "linkedin"] as const;

export function ContactSection() {
  const { dictionary } = useI18n();
  const copy = dictionary.contact;

  return (
    <SectionShell id="contact" eyebrow={copy.eyebrow} title={copy.title}>
      <ul className="reveal max-w-3xl border-t border-white/10">
        {CHANNELS.map((channel) => {
          const value = profile.contact[channel];
          const isEmail = channel === "email";
          return (
            <li key={channel} className="border-b border-white/10">
              {value ? (
                <a
                  href={isEmail ? `mailto:${value}` : value}
                  {...(isEmail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                  className="group flex min-h-16 items-center justify-between gap-6 py-4 text-xl transition-colors hover:text-accent md:text-2xl"
                >
                  <span>{copy[channel]}</span>
                  <span className="flex items-center gap-2 text-base text-fog-400 group-hover:text-accent">
                    {isEmail && value}
                    <ArrowUpRight aria-hidden="true" className="size-5" />
                    {!isEmail && <span className="sr-only">({dictionary.common.opensInNewTab})</span>}
                  </span>
                </a>
              ) : (
                <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 text-xl md:text-2xl">
                  <span>{copy[channel]}</span>
                  <Placeholder label={copy.placeholders[channel]} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
