"use client";

import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import type { ResolvedCarouselSlide } from "./carousel-block-renderer";

export function CarouselInteraction({
  id,
  anchor,
  slides,
}: {
  id: string;
  anchor?: string | null;
  slides: ResolvedCarouselSlide[];
}) {
  const [selected, setSelected] = useState(0);
  const navigate = (step: number) =>
    setSelected((current) => (current + step + slides.length) % slides.length);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") navigate(1);
    else if (event.key === "ArrowLeft") navigate(-1);
    else if (event.key === "Home") setSelected(0);
    else if (event.key === "End") setSelected(slides.length - 1);
    else return;
    event.preventDefault();
  };
  return (
    <section
      className="carousel-block"
      id={anchor ?? undefined}
      aria-label="Galeria de imagens"
      aria-roledescription="carrossel"
      onKeyDown={onKeyDown}
    >
      {slides.map(({ item, image }, index) => (
        <figure
          key={index}
          id={`${id}-slide-${index}`}
          className="carousel-block-slide"
          aria-roledescription="slide"
          aria-label={`${index + 1} de ${slides.length}`}
          hidden={selected !== index}
        >
          {item.url ? (
            <a href={item.url}>
              <Image
                src={image.src}
                width={image.width}
                height={image.height}
                sizes="(min-width: 1280px) 1100px, 100vw"
                alt={item.alt}
                unoptimized
              />
            </a>
          ) : (
            <Image
              src={image.src}
              width={image.width}
              height={image.height}
              sizes="(min-width: 1280px) 1100px, 100vw"
              alt={item.alt}
              unoptimized
            />
          )}
          {item.caption?.trim() && <figcaption>{item.caption}</figcaption>}
        </figure>
      ))}
      {slides.length > 1 && (
        <div className="carousel-block-controls">
          <button type="button" onClick={() => navigate(-1)} aria-label="Slide anterior">
            Anterior
          </button>
          <p role="status" aria-live="polite">
            Imagem {selected + 1} de {slides.length}
          </p>
          <button type="button" onClick={() => navigate(1)} aria-label="Próximo slide">
            Próximo
          </button>
          <div className="carousel-block-selectors" aria-label="Selecionar slide">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Mostrar slide ${index + 1}`}
                aria-current={selected === index ? "true" : undefined}
                aria-controls={`${id}-slide-${index}`}
                onClick={() => setSelected(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
