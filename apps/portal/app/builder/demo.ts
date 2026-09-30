import type { BuilderBlock } from "./contracts";
import { mediaFixture } from "./contracts";

/** Static, public-safe fixture; never a saved PageVersion. */
export const demoBlocks: BuilderBlock[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    position: 0,
    type: "HERO",
    isVisible: true,
    schemaVersion: 1,
    background: "SURFACE",
    anchor: "boas-vindas",
    data: {
      title: "Conheça a ETMSL",
      description: "Uma demonstração local de página por blocos.",
      imageId: mediaFixture[0].id,
      imageAlt: "Ilustração da fachada da ETMSL",
      decorative: false,
      buttonLabel: "Página institucional",
      buttonUrl: "/etmsl",
    },
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    position: 1,
    type: "TEXT",
    isVisible: true,
    schemaVersion: 1,
    background: "NONE",
    data: {
      title: "Aprender e transformar",
      body: "Este texto vem de uma fixture. O editor ainda não salva páginas no servidor.",
    },
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    position: 2,
    type: "IMAGE",
    isVisible: true,
    schemaVersion: 1,
    background: "NONE",
    data: {
      imageId: mediaFixture[1].id,
      alt: "Ilustração de estantes com livros",
      caption: "Biblioteca ilustrativa",
      decorative: false,
      link: "",
    },
  },
];
