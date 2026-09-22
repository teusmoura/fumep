import type { QuickLinkIconV1 } from "@fumep/validation";

const paths: Record<QuickLinkIconV1, string> = {
  ARROW_RIGHT: "M5 12h14m-6-6 6 6-6 6",
  EXTERNAL_LINK: "M14 5h5v5m0-5-9 9M19 13v6H5V5h6",
  DOWNLOAD: "M12 4v11m-5-5 5 5 5-5M5 20h14",
  DOCUMENT: "M7 3h7l4 4v14H7V3Zm7 0v5h5M10 12h5m-5 4h5",
  CALENDAR: "M5 6h14v14H5V6Zm3-3v6m8-6v6M5 10h14",
  LOCATION: "M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
};

export function QuickLinkIcon({ icon }: { icon: QuickLinkIconV1 }) {
  return (
    <svg
      className="quick-link-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[icon]} />
    </svg>
  );
}
