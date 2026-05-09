import Image from "next/image";
import { BRAND } from "@/config/global";
import { cn } from "@/lib/cn";

interface LogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

export function Logo({ size = 28, className, alt = `${BRAND.name} logo` }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={cn("h-auto w-auto select-none", className)}
      style={{ width: size, height: size }}
      priority
    />
  );
}
