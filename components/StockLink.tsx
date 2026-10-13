"use client";
import Link, { useLinkStatus } from "next/link";
import { useState, type ComponentProps } from "react";
import { useLanguage } from "./LanguageProvider";

export function LinkFeedback() {
  const { pending } = useLinkStatus();
  const { dictionary } = useLanguage();
  return pending ? <span className="link-feedback" role="status" aria-label={dictionary.common.loading} /> : null;
}

export default function StockLink(props: ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);
  return <Link {...props} prefetch={intent} onMouseEnter={(event) => { setIntent(true); props.onMouseEnter?.(event); }} onFocus={(event) => { setIntent(true); props.onFocus?.(event); }} onTouchStart={(event) => { setIntent(true); props.onTouchStart?.(event); }}>{props.children}<LinkFeedback /></Link>;
}
