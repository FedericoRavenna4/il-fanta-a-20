import SocietaClient from "./SocietaClient";
import { getSocieta } from "@/lib/societa";
import PageHeader from "../components/PageHeader";
import Image from "next/image";

export default function SocietaPage() {
  const societa = getSocieta();

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
      <PageHeader
        eyebrow="Archivio ufficiale"
        title="Le Società"
        description="Le 100 società del Fanta a 20: identità, protagonisti e storie che hanno costruito la competizione stagione dopo stagione."
        descriptionClassName="lg:max-w-none xl:whitespace-nowrap"
      />

      <div className="relative left-1/2 mb-12 w-screen -translate-x-1/2 overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="home-club-marquee flex w-max items-center gap-10 pr-10">
          {[...societa, ...societa].map((team, index) => (
            <div
              key={`${team.id}-${index}`}
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center"
            >
              <Image
                src={team.logo}
                alt=""
                width={76}
                height={76}
                className="max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.16)]"
              />
            </div>
          ))}
        </div>
      </div>

      <SocietaClient societa={societa} />
    </section>
  );
}
