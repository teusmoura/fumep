import { parseVideoUrlV1, videoBlockSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";
import { VideoPlayer } from "./video-player";

export interface VideoBlockRendererProps {
  block: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

export function VideoBlockRenderer({ block, backgroundImage, theme }: VideoBlockRendererProps) {
  const parsed = videoBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const { title, url, description } = parsed.data.data;
  const video = parseVideoUrlV1(url);
  if (!video) return null;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <section
        className="video-block"
        id={parsed.data.anchor ?? undefined}
        aria-label={`Vídeo: ${title}`}
      >
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        <VideoPlayer title={title} embedUrl={video.embedUrl} />
        <p>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Abrir vídeo no {video.provider === "YOUTUBE" ? "YouTube" : "Vimeo"}{" "}
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </p>
      </section>
    </BlockBackground>
  );
}
