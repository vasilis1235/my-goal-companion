// Custom SVG icons that follow lucide style: 24x24, stroke=currentColor, strokeWidth=2, fill=none
// Use like: <FatCellsIcon className="w-5 h-5" />

import { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  strokeWidth?: number;
}

const base = (strokeWidth: number, size: number, props: SVGProps<SVGSVGElement>) => ({
  xmlns: "http://www.w3.org/2000/svg",
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

// Λιποκύτταρα: 3 μικρά κυκλάκια (cluster)
export const FatCellsIcon = ({ size = 24, strokeWidth = 2, ...props }: IconProps) => (
  <svg {...base(strokeWidth, size, props)}>
    <circle cx="8" cy="9" r="3.5" />
    <circle cx="16" cy="9" r="3.5" />
    <circle cx="12" cy="16" r="3.5" />
  </svg>
);

// Μύες: χέρι που σφίγγει τους δικέφαλους (flexed biceps)
export const FlexBicepIcon = ({ size = 24, strokeWidth = 2, ...props }: IconProps) => (
  <svg {...base(strokeWidth, size, props)}>
    {/* Forearm rising up */}
    <path d="M4 20 L4 14 C 4 10, 7 8, 11 8" />
    {/* Fist on top */}
    <path d="M11 5 a 3 3 0 0 1 3 3 v 1 a 3 3 0 0 1 -3 3" />
    {/* Biceps bulge */}
    <path d="M11 12 C 15 12, 18 14, 18 17 C 18 19, 16 20, 13 20 L 4 20" />
    {/* Bicep peak detail */}
    <path d="M14 15.5 q 1 1 0 2" />
  </svg>
);
