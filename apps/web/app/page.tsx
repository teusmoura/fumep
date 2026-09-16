import { renderInstitutionHome } from "../institution/institution-home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return renderInstitutionHome("/");
}
