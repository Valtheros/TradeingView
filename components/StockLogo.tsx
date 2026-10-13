"use client";

import Image from "next/image";
import { Building2 } from "lucide-react";
import { useState } from "react";

export default function StockLogo({ logo }: { logo?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={`stock-logo${logo === undefined ? " skeleton-block" : ""}`} aria-hidden="true">
    {logo && logo !== failed ? <Image src={logo} alt="" width={64} height={64} unoptimized referrerPolicy="no-referrer" onError={() => setFailed(logo)} /> : logo !== undefined ? <Building2 size={20} /> : null}
  </span>;
}
