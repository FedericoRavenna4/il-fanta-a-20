import fs from "fs";
import path from "path";
import SocietaClient from "./SocietaClient";

function getLega(numero: number) {
  if (numero <= 20) return "Serie A";
  if (numero <= 40) return "Serie B";
  if (numero <= 60) return "Serie C - Girone A";
  if (numero <= 80) return "Serie C - Girone B";
  return "Serie C - Girone C";
}

function formatNome(fileName: string) {
  return fileName
    .replace(".png", "")
    .replace(/^\d+_/, "")
    .replace(/_/g, " ");
}

export default function SocietaPage() {
  const societaPath = path.join(process.cwd(), "public", "societa");

  const files = fs
    .readdirSync(societaPath)
    .filter((file) => file.endsWith(".png"))
    .sort();

  const societa = files.map((file) => {
    const numero = Number(file.split("_")[0]);

    return {
      id: numero,
      nome: formatNome(file),
      logo: `/societa/${file}`,
      lega: getLega(numero),
      ranking: numero,
      leader: numero === 1,
    };
  });

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="uppercase tracking-[0.3em] text-sm text-slate-500 mb-3">
          Archivio società
        </p>

        <h1 className="text-5xl font-bold text-blue-950 mb-4">
          Società
        </h1>

        <p className="text-slate-600 max-w-2xl">
          Le 100 società che compongono Il Fanta a 20, suddivise per lega e girone.
        </p>
      </div>

      <SocietaClient societa={societa} />
    </section>
  );
}