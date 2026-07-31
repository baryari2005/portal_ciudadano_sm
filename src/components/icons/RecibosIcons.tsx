// src/components/icons/RecibosIcons.tsx
import * as React from "react";

export const IconImportarUsuarios = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="8" cy="8" r="3" />
    <path d="M3.5 18.5c0-2.4 2-4.5 4.5-4.5s4.5 2.1 4.5 4.5" />
    <path d="M16 4v6" />
    <path d="m13.5 7.5 2.5 2.5 2.5-2.5" />
  </svg>
);

export const IconExportarUsuarios = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="8" cy="8" r="3" />
    <path d="M3.5 18.5c0-2.4 2-4.5 4.5-4.5s4.5 2.1 4.5 4.5" />
    <path d="M16 12V6" />
    <path d="m13.5 8.5 2.5-2.5 2.5 2.5" />
  </svg>
);

export const IconSubirPdfRecibos = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 3H14.2L18 6.8V19a2 2 0 0 1-2 2H10" />
    <path d="M14 3v4h4" />
    <path d="M5 17v4h5v-4" />
    <path d="m7.5 15 2.5 2 2.5-2" />
    <rect x="4" y="4" width="5.5" height="5" rx="1" />
    <path d="M5 7.8V5.4h1a.9.9 0 0 1 0 1.8H5Z" />
    <path d="M7.2 7.8V5.4h1" />
    <path d="M9.4 7.8V5.4h.9a.8.8 0 0 1 0 1.6h-.9" />
  </svg>
);

export const IconSeguimientoRecibos = (
  props: React.SVGProps<SVGSVGElement>,
) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 3H15l3 3v10a2 2 0 0 1-2 2h-2" />
    <path d="M15 3v4h4" />
    <circle cx="8.5" cy="14.5" r="3.2" />
    <path d="m11 17 2 2" />
    <path d="M12.5 8.5H8.5" />
    <path d="M11.5 11H8.5" />
  </svg>
);
