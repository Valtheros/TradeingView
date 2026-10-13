"use client";

import { Component, useTransition, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

export function LoadFailure({ retry }: { retry: () => void }) {
  const { dictionary } = useLanguage();
  const [pending, startTransition] = useTransition();
  return <div className="load-failure" role="alert"><p>{dictionary.daily.loadError}</p><button className="action-button secondary" disabled={pending} onClick={() => startTransition(retry)}><RefreshCw size={18} />{dictionary.daily.retry}</button></div>;
}

class Boundary extends Component<{ children: ReactNode; retry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: Readonly<{ children: ReactNode; retry: () => void }>) {
    if (previous.children !== this.props.children && this.state.failed) this.setState({ failed: false });
  }
  render() { return this.state.failed ? <LoadFailure retry={this.props.retry} /> : this.props.children; }
}

export default function SectionBoundary({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { locale } = useLanguage();
  return <Boundary key={locale} retry={() => router.refresh()}>{children}</Boundary>;
}
