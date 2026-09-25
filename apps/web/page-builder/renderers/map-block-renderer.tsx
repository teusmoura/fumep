import { mapBlockSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";

export interface MapBlockRendererProps {
  block: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

export function MapBlockRenderer({ block, backgroundImage, theme }: MapBlockRendererProps) {
  const parsed = mapBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const { title, latitude, longitude, address, zoom = 16 } = parsed.data.data;
  const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=${zoom}`;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <section
        className="map-block"
        id={parsed.data.anchor ?? undefined}
        aria-label={title ?? "Localização"}
      >
        {title && <h2>{title}</h2>}
        <div className="map-block-location">
          <span className="map-block-pin" aria-hidden="true">
            ⌖
          </span>
          <div>
            <p className="map-block-address">{address}</p>
            <p className="map-block-coordinates">
              Coordenadas: {latitude}, {longitude}
            </p>
            <a href={url} target="_blank" rel="noopener noreferrer">
              Abrir localização no OpenStreetMap <span className="sr-only">(abre em nova aba)</span>
            </a>
          </div>
        </div>
      </section>
    </BlockBackground>
  );
}
