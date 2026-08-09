import Image from "next/image";
import { accountInitials } from "@/lib/account/avatar";

export default function ProfileAvatar({ username, avatarUrl, size = "large" }: { username: string; avatarUrl: string | null; size?: "large" | "small" | "header" }) {
  const dimensions = size === "large" ? "h-28 w-28 border-4 sm:h-36 sm:w-36" : size === "header" ? "h-10 w-10 border-2" : "h-12 w-12 border-4";
  const imageSize = size === "large" ? "144px" : size === "header" ? "40px" : "48px";
  return <div data-avatar-fallback={avatarUrl ? "false" : "true"} className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-white bg-gradient-to-br from-sky-400 to-blue-950 font-black text-white shadow-xl ${dimensions}`}>{avatarUrl ? <Image src={avatarUrl} alt={`Avatar di ${username}`} fill sizes={imageSize} className="object-cover" /> : <span className={size === "large" ? "text-3xl sm:text-4xl" : "text-xs"}>{accountInitials(username)}</span>}</div>;
}
