import Image from "next/image";
import Link from "next/link";
import NavItems from "./NavItems";
import UserDropdown from "./UserDropdown";
import LanguageToggle from "./LanguageToggle";
import GuestControls from "./GuestControls";

export default function Header({ user }: { user: User | null }) {
  return <header className="app-header"><div className="app-header-inner">
    <Link href="/" className="brand-link" aria-label="StockMarket"><Image src="/assets/icons/logo.svg" alt="StockMarket" width={1138} height={218} style={{ height: "auto" }} priority /></Link>
    <NavItems />
    <div className="header-controls">{user ? <><LanguageToggle className="desktop-language" /><UserDropdown user={user} /></> : <GuestControls />}</div>
  </div></header>;
}
