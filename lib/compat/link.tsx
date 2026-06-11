import type { ComponentProps } from "react";
import { Link as RouterLink } from "react-router";

type CompatLinkProps = Omit<ComponentProps<typeof RouterLink>, "to"> & {
  href: string;
  /** Next-only prop — ignored */
  prefetch?: boolean;
};

/** Drop-in replacement ของ next/link (default export, รับ href) */
export default function Link({ href, ...props }: CompatLinkProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { prefetch, ...rest } = props;
  return <RouterLink to={href} {...rest} />;
}
