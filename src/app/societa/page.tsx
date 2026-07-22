import SocietaClient from "./SocietaClient";
import { getSocieta } from "@/lib/societa";
import PageHeader from "../components/PageHeader";
import Image from "next/image";

export default function SocietaPage() {
  const societa = getSocieta();

  return (
    <section className="bg-[linear-gradient(180deg,#f8fbff_0%,#f3f8fc_48%,#f8fafc_100%)]">
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
      <PageHeader
        eyebrow="Archivio ufficiale"
        title="Le Società"
        description="Le 100 società del Fanta a 20: identità, protagonisti e storie che hanno costruito la competizione stagione dopo stagione."
        descriptionClassName="lg:max-w-none xl:whitespace-nowrap"
      />

      <div className="relative left-1/2 mb-12 w-screen -translate-x-1/2 overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] max-sm:mb-9 max-sm:py-3">
        <div className="home-club-marquee flex w-max items-center gap-10 pr-10 max-sm:gap-7 max-sm:pr-7">
          {[...societa, ...societa].map((team, index) => (
            <div
              key={`${team.id}-${index}`}
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center max-sm:h-16 max-sm:w-16"
            >
              <Image
                src={team.logo}
                alt=""
                width={76}
                height={76}
                className="max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.16)] max-sm:max-h-14 max-sm:max-w-14"
              />
            </div>
          ))}
        </div>
      </div>

      <SocietaClient societa={societa} />
    </div>
    </section>
  );
}
