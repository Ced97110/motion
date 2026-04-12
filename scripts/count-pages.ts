import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

async function main() {
  const dir = "knowledge-base/raw";
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".pdf")).sort();
  let total = 0;
  for (const f of files) {
    const bytes = await fs.readFile(path.join(dir, f));
    const doc = await PDFDocument.load(new Uint8Array(bytes), {
      ignoreEncryption: true,
    });
    const pages = doc.getPageCount();
    total += pages;
    console.log(`  ${pages.toString().padStart(4)} pp  ${f}`);
  }
  console.log(`\n  ${total} pages total across ${files.length} PDFs`);
}

main();
