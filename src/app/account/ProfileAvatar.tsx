import Image from "next/image";
import { accountInitials } from "@/lib/account/avatar";

export default function ProfileAvatar({ username, avatarUrl, size = "large" }: { username: string; avatarUrl: string | null; size?: "large" | "small" }) {
  const dimensions = size === "large" ? "h-28 w-28 sm:h-36 sm:w-36" : "h-12 w-12";
  return <div data-avatar-fallback={avatarUrl ? "false" : "true"} className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-sky-400 to-blue-950 font-black text-white shadow-xl ${dimensions}`}>{avatarUrl ? <Image src={avatarUrl} alt={`Avatar di ${username}`} fill sizes={size === "large" ? "144px" : "48px"} className="object-cover" /> : <span className={size === "large" ? "text-3xl sm:text-4xl" : "text-sm"}>{accountInitials(username)}</span>}</div>;
}
