import { cn } from "@/lib/utils";
import { useId } from "react";

export type CodexLogoProps = {
  className?: string;
  size?: number;
  title?: string;
};

export function CodexLogo({
  className,
  size = 32,
  title = "Codex infinite logo",
}: CodexLogoProps) {
  const viewBoxWidth = 48;
  const viewBoxHeight = 40;
  const id = useId();
  const gradientId = `${id}-gradient`;
  const glowId = `${id}-glow`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={(size * viewBoxHeight) / viewBoxWidth}
      viewBox="-4 -4 48 40"
      fill="none"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>

      <defs>
        <linearGradient
          id={gradientId}
          x1="4"
          y1="16"
          x2="36"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        <filter id={glowId} x="-30%" y="-40%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft glow */}
      <path
        d="M8.2 16c0-4.7 3.1-8 7.4-8 2.7 0 4.9 1.3 7 4.3L24 14l1.4-1.7c2.1-3 4.3-4.3 7-4.3 4.3 0 7.4 3.3 7.4 8s-3.1 8-7.4 8c-2.7 0-4.9-1.3-7-4.3L24 18l-1.4 1.7c-2.1 3-4.3 4.3-7 4.3-4.3 0-7.4-3.3-7.4-8Z"
        stroke="url(#${gradientId})"
        strokeWidth="6.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.18"
        filter={`url(#${glowId})`}
      />

      {/* Main infinity stroke */}
      <path
        d="M8.2 16c0-4.7 3.1-8 7.4-8 2.7 0 4.9 1.3 7 4.3L24 14l1.4-1.7c2.1-3 4.3-4.3 7-4.3 4.3 0 7.4 3.3 7.4 8s-3.1 8-7.4 8c-2.7 0-4.9-1.3-7-4.3L24 18l-1.4 1.7c-2.1 3-4.3 4.3-7 4.3-4.3 0-7.4-3.3-7.4-8Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="4.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center weave highlight */}
      <path
        d="M18.7 12.8 24 19.2"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M22 12.8 16.8 19.2"
        stroke="#0F172A"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.22"
      />
    </svg>
  );
}
