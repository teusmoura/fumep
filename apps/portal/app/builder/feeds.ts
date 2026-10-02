import type { BuilderBlock } from "./contracts";
import { feedCategoryFixture, feedInstitutionFixture, mediaFixture } from "./contracts";

type FeedBlock = Extract<
  BuilderBlock,
  {
    type:
      | "NEWS_FEED"
      | "EVENT_FEED"
      | "COURSE_FEED"
      | "CONTEST_FEED"
      | "SELECTION_PROCESS_FEED"
      | "GALLERY_FEED";
  }
>;
export type FeedItem = {
  title: string;
  description: string;
  url: string;
  imageSrc?: string;
  imageAlt?: string;
};
const [fumep, etmsl] = feedInstitutionFixture.map((item) => item.id);
const [institutional, education] = feedCategoryFixture.map((item) => item.id);
const fixtureRows: (FeedItem & {
  type: Exclude<FeedBlock["type"], "GALLERY_FEED">;
  institutionId: string;
  categoryId?: string;
  status?: "OPEN" | "CLOSED";
})[] = [
  {
    type: "NEWS_FEED",
    title: "Notícia institucional de exemplo",
    description: "Conteúdo ilustrativo da FUMEP.",
    url: "/",
    institutionId: fumep!,
    categoryId: institutional,
  },
  {
    type: "NEWS_FEED",
    title: "Notícia de ensino de exemplo",
    description: "Conteúdo ilustrativo da ETMSL.",
    url: "/etmsl",
    institutionId: etmsl!,
    categoryId: education,
  },
  {
    type: "EVENT_FEED",
    title: "Próximo evento de exemplo",
    description: "Agenda ilustrativa da ETMSL.",
    url: "/etmsl",
    institutionId: etmsl!,
    categoryId: education,
  },
  {
    type: "EVENT_FEED",
    title: "Encontro institucional de exemplo",
    description: "Agenda ilustrativa da FUMEP.",
    url: "/",
    institutionId: fumep!,
    categoryId: institutional,
  },
  {
    type: "COURSE_FEED",
    title: "Curso técnico de exemplo",
    description: "Oferta ilustrativa da ETMSL.",
    url: "/etmsl",
    institutionId: etmsl!,
  },
  {
    type: "COURSE_FEED",
    title: "Formação de exemplo",
    description: "Oferta ilustrativa da FUMEP.",
    url: "/",
    institutionId: fumep!,
  },
  {
    type: "CONTEST_FEED",
    title: "Concurso aberto de exemplo",
    description: "Sem vínculo com processo real.",
    url: "/",
    institutionId: fumep!,
    status: "OPEN",
  },
  {
    type: "CONTEST_FEED",
    title: "Concurso encerrado de exemplo",
    description: "Sem vínculo com processo real.",
    url: "/",
    institutionId: fumep!,
    status: "CLOSED",
  },
  {
    type: "SELECTION_PROCESS_FEED",
    title: "Seleção aberta de exemplo",
    description: "Sem vínculo com processo real.",
    url: "/etmsl",
    institutionId: etmsl!,
    status: "OPEN",
  },
  {
    type: "SELECTION_PROCESS_FEED",
    title: "Seleção encerrada de exemplo",
    description: "Sem vínculo com processo real.",
    url: "/etmsl",
    institutionId: etmsl!,
    status: "CLOSED",
  },
];

export function feedItemsFor(block: FeedBlock): FeedItem[] {
  if (block.type === "GALLERY_FEED")
    return mediaFixture.slice(0, block.data.limit).map((media) => ({
      title: media.label,
      description: "Imagem ilustrativa da galeria de demonstração.",
      url: "",
      imageSrc: media.src,
      imageAlt: media.label,
    }));
  const data = block.data;
  return fixtureRows
    .filter((item) => item.type === block.type)
    .filter(
      (item) =>
        !data.institutionIds.length || data.institutionIds.includes(item.institutionId as never),
    )
    .filter(
      (item) =>
        !("categoryIds" in data) ||
        !data.categoryIds.length ||
        data.categoryIds.includes(item.categoryId as never),
    )
    .filter((item) => !("status" in data) || data.status === "ALL" || data.status === item.status)
    .slice(0, data.limit);
}
