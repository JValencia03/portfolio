"use client";

import { ArrowUpRight } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";
import { profile } from "@/data/profile";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SectionShell } from "./SectionShell";

const CHANNELS = ["email", "github", "linkedin"] as const;

/** Contact as an editorial index: one large row per channel. */
export function ContactSection() {
  const { dictionary } = useI18n();
  const copy = dictionary.contact;

  return (
    <SectionShell id="contact" eyebrow={copy.eyebrow} title={copy.title}>
      <ul className="reveal max-w-4xl border-t border-white/10">
        {CHANNELS.map((channel, index) => {
          const value = profile.contact[channel];
          const isEmail = channel === "email";
          const name = (
            <span className="flex items-baseline gap-4 md:gap-6">
              <span aria-hidden="true" className="font-mono text-xs text-fog-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="contact-name">{copy[channel]}</span>
            </span>
          );
          return (
            <li key={channel} className="border-b border-white/10">
              {value ? (
                <a
                  href={isEmail ? `mailto:${value}` : value}
                  {...(isEmail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                  className="contact-row group"
                >
                  {name}
                  <span className="flex items-center gap-2 text-base text-fog-400 transition-colors group-hover:text-accent">
                    {isEmail && value}
                    <ArrowUpRight aria-hidden="true" className="contact-arrow size-6" />
                    {!isEmail && <span className="sr-only">({dictionary.common.opensInNewTab})</span>}
                  </span>
                </a>
              ) : (
                <div className="contact-row flex-wrap gap-y-2">
                  {name}
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
