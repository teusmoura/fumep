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
  {
    id: "44444444-4444-4444-8444-444444444444",
    position: 3,
    type: "IMAGE_TEXT",
    isVisible: true,
    schemaVersion: 1,
    background: "SURFACE",
    data: {
      title: "Espaços para aprender",
      text: "A formação também acontece nos espaços de convivência.",
      imageId: mediaFixture[1].id,
      imageAlt: "Ilustração de estantes com livros",
      imagePosition: "IMAGE_RIGHT",
      buttonLabel: "Conheça a ETMSL",
      buttonUrl: "/etmsl",
    },
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    position: 4,
    type: "CARDS",
    isVisible: true,
    schemaVersion: 1,
    background: "NONE",
    data: {
      title: "Explore o portal",
      items: [
        {
          imageId: mediaFixture[0].id,
          alt: "Ilustração da fachada da ETMSL",
          title: "Escola",
          description: "Conheça a instituição.",
          url: "/etmsl",
        },
        {
          imageId: mediaFixture[1].id,
          alt: "Ilustração de estantes com livros",
          title: "Biblioteca",
          description: "Espaços de estudo.",
          url: "",
        },
      ],
    },
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    position: 5,
    type: "QUICK_LINKS",
    isVisible: true,
    schemaVersion: 1,
    background: "SURFACE",
    data: {
      title: "Acesso rápido",
      items: [
        { label: "FUMEP", url: "/", icon: "ARROW" },
        { label: "ETMSL", url: "/etmsl", icon: "BOOK" },
      ],
    },
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    position: 6,
    type: "CTA",
    isVisible: true,
    schemaVersion: 1,
    background: "SURFACE",
    data: {
      title: "Venha conhecer",
      text: "Explore a página institucional.",
      buttonLabel: "Abrir ETMSL",
      buttonUrl: "/etmsl",
    },
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    position: 7,
    type: "FAQ",
    isVisible: true,
    schemaVersion: 1,
    background: "NONE",
    data: {
      title: "Perguntas frequentes",
      items: [
        {
          question: "Como posso conhecer a escola?",
          answer: "Consulte os canais institucionais da ETMSL.",
        },
        {
          question: "Onde encontro novidades?",
          answer: "Acompanhe as páginas públicas do portal.",
        },
      ],
    },
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    position: 8,
    type: "TABS",
    isVisible: true,
    schemaVersion: 1,
    background: "SURFACE",
    data: {
      tabs: [
        { label: "Ensino", content: "Conheça as atividades de ensino da instituição." },
        { label: "Espaços", content: "Explore os espaços de aprendizagem." },
      ],
    },
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab",
    position: 9,
    type: "TABLE",
    isVisible: true,
    schemaVersion: 1,
    background: "NONE",
    data: {
      caption: "Exemplo de horários",
      headers: ["Atividade", "Período"],
      rows: [["Atendimento", "Manhã"]],
    },
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc",
    position: 10,
    type: "TIMELINE",
    isVisible: true,
    schemaVersion: 1,
    background: "SURFACE",
    data: {
      title: "Nossa trajetória",
      items: [
        {
          date: "2026",
          title: "Novo portal",
          description: "Uma etapa de modernização institucional.",
        },
      ],
    },
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccd",
    position: 11,
    type: "STATISTICS",
    isVisible: true,
    schemaVersion: 1,
    background: "NONE",
    data: { items: [{ value: "3", label: "Instituições", description: "FUMEP, ETMSL e CRAMAM" }] },
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddde",
    position: 12,
    type: "CAROUSEL",
    isVisible: true,
    schemaVersion: 1,
    background: "SURFACE",
    data: {
      items: [
        {
          imageId: mediaFixture[0].id,
          alt: "Fachada ilustrada da ETMSL",
          caption: "Escola",
          url: "/etmsl",
        },
        {
          imageId: mediaFixture[1].id,
          alt: "Estantes ilustradas da biblioteca",
          caption: "Biblioteca",
          url: "",
        },
      ],
    },
  },
];
