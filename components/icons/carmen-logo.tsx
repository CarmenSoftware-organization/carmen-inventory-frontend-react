import { cn } from "@/lib/utils";

const PETAL_ANGLES = [15, 75, 135, 195, 255, 315] as const;

const PETALS = PETAL_ANGLES.map((angle, i) => {
  const opacity = i % 2 === 0 ? "" : ' fill-opacity="0.78"';
  return `<ellipse cx="0" cy="-18" rx="17" ry="26" fill="#ffffff"${opacity} transform="rotate(${angle})"/>`;
}).join("");

const CARMEN_MARK_INNER =
  `<path d="M 27 4 H 73 Q 96 4 96 27 V 73 Q 96 96 73 96 H 27 Q 4 96 4 73 V 27 Q 4 4 27 4 Z" fill="#0154BD"/>` +
  `<path d="M 27 4 H 73 Q 96 4 96 27 V 38 Q 70 28 50 28 T 4 38 V 27 Q 4 4 27 4 Z" fill="#ffffff" opacity="0.10"/>` +
  `<g transform="translate(50 52) scale(0.8)">${PETALS}` +
  `<circle r="9" fill="#ffffff" fill-opacity="0.32"/>` +
  `<circle r="4" fill="#ffffff" fill-opacity="0.55"/>` +
  `</g>`;

const CARMEN_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${CARMEN_MARK_INNER}</svg>`;

export const CARMEN_ICON_DATA_URI = `data:image/svg+xml,${encodeURIComponent(CARMEN_MARK_SVG)}`;

type CarmenLogoProps = {
  readonly variant?: "mark" | "lockup";
  readonly size?: number;
  readonly className?: string;
  readonly title?: string;
};

export function CarmenLogo({
  variant = "mark",
  size = 32,
  className,
  title = "Carmen",
}: CarmenLogoProps) {
  if (variant === "lockup") {
    return (
      <div
        className={cn("inline-flex items-center gap-2", className)}
        aria-label={title}
      >
        <CarmenMarkSvg size={size} title={title} />
        <span
          className="text-foreground font-bold tracking-tight"
          style={{
            fontSize: `${size * 0.625}px`,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Carmen
        </span>
      </div>
    );
  }

  return <CarmenMarkSvg size={size} title={title} className={className} />;
}

type CarmenMarkSvgProps = {
  readonly size: number;
  readonly title: string;
  readonly className?: string;
};

function CarmenMarkSvg({ size, title, className }: CarmenMarkSvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
      dangerouslySetInnerHTML={{
        __html: `<title>${title}</title>${CARMEN_MARK_INNER}`,
      }}
    />
  );
}
