import Image from "next/image";

export default function BracketFinal() {
  return (
    <div className="flex min-w-[120px] flex-col items-center justify-center">
      <p className="mb-3 rounded-full bg-white/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white ring-1 ring-white/15">
        Finale
      </p>
      
      <Image
        unoptimized
        src="/trofei/coppa-fanta-a-20.png?v=20260713-1602"
        alt="Coppa Fanta a 20"
        width={130}
        height={130}
        className="h-auto max-h-28 w-auto object-contain drop-shadow-[0_0_36px_rgba(251,191,36,0.82)] transition duration-300 hover:scale-105 hover:drop-shadow-[0_0_54px_rgba(251,191,36,0.95)]"
      />
    </div>
  );
}
