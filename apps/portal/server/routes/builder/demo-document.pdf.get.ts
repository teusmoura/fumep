/** Fixed, public-safe PDF fixture. This is not a Media Library object. */
function demoPdf(): string {
  const stream = "BT /F1 18 Tf 72 720 Td (Portal FUMEP - PDF demonstrativo) Tj ET\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return body;
}

export default defineEventHandler(
  () =>
    new Response(demoPdf(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="fumep-demonstracao.pdf"',
        "Cache-Control": "public, max-age=3600",
      },
    }),
);
