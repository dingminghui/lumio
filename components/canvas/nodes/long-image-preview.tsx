"use client";

/* eslint-disable @next/next/no-img-element */
import { LONG_IMAGE_CONTENT_WIDTH } from "@/lib/skills/long-image/constants";
import {
  splitLongImageParagraphs,
  type LongImageAsset,
  type LongImageSection,
} from "@/lib/skills/long-image/state";

type LongImagePreviewProps = {
  contentRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  subtitle: string;
  summary: string;
  sections: LongImageSection[];
  imagesById: Map<string, LongImageAsset>;
  onImageLoad?: () => void;
};

export function LongImagePreview({
  contentRef,
  title,
  subtitle,
  summary,
  sections,
  imagesById,
  onImageLoad,
}: LongImagePreviewProps) {
  return (
    <div
      ref={contentRef}
      className="mx-auto box-border w-full bg-[#f4efdf] px-6 py-8 font-serif text-center text-[#3d382f] shadow-sm"
      style={{ width: LONG_IMAGE_CONTENT_WIDTH }}
    >
      <header className="mb-8">
        <p className="mb-3 text-[10px] tracking-[0.2em] text-[#8b806a]">
          LUMIO LONG IMAGE
        </p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-normal">
          {title || "未命名长图"}
        </h1>
        {subtitle ? (
          <p className="mx-auto mt-3 max-w-[90%] text-[11px] leading-5 text-[#7a705e]">
            {subtitle}
          </p>
        ) : null}
      </header>

      {summary ? (
        <section className="mb-8 bg-[#ebe4cf] px-5 py-4 text-left text-[12px] leading-6 text-[#605744]">
          {summary}
        </section>
      ) : null}

      <div className="flex flex-col gap-8">
        {sections.map((section, index) => {
          const image = section.imageId
            ? imagesById.get(section.imageId)
            : undefined;

          return (
            <section
              key={`${section.title}-${index}`}
              className="flex flex-col items-center gap-4"
            >
              <div>
                <p className="text-[10px] tracking-[0.18em] text-[#9a8b69]">
                  第 {String(index + 1).padStart(2, "0")} 节
                </p>
                <h2 className="mt-2 text-[19px] leading-7 font-semibold tracking-normal text-[#4d4636]">
                  {section.title}
                </h2>
              </div>

              {image ? (
                <div className="w-full overflow-hidden bg-[#ded3b9]">
                  <img
                    src={image.src}
                    alt={image.prompt || section.title}
                    className="mx-auto block h-auto w-full object-contain"
                    draggable={false}
                    onLoad={onImageLoad}
                  />
                </div>
              ) : null}

              <div className="flex w-full flex-col gap-3 text-left text-[12px] leading-6">
                {splitLongImageParagraphs(section.body).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              {section.quote ? (
                <blockquote className="w-full border-l-2 border-[#b0905f] bg-[#efe8d7] px-4 py-3 text-left text-[12px] leading-6 text-[#6e5631]">
                  {section.quote}
                </blockquote>
              ) : null}
            </section>
          );
        })}
      </div>

    </div>
  );
}
