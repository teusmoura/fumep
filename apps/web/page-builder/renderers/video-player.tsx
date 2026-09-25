"use client";

import { useState } from "react";

export function VideoPlayer({ title, embedUrl }: { title: string; embedUrl: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="video-block-player">
      {loaded ? (
        <iframe
          title={title}
          src={embedUrl}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" onClick={() => setLoaded(true)}>
          Carregar vídeo: {title}
        </button>
      )}
    </div>
  );
}
