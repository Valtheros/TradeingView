import Image from "next/image";
import Link from "next/link";
import NavItems from "./NavItems";
import { DropdownMenu } from "./ui/dropdown-menu";
import UserDropdown from "./UserDropdown";

const Header = ({user}: {user: User}) => {
  return (
    <header className="sticky top-0 header">
      <div className="container header-wrapper">
        <Link href="/">
          <Image
            src="/assets/icons/logo.svg"
            alt="logo"
            width={140}
            height={32}
            className="h-8 w-auto curser-pointer"
          />
        </Link>
        <nav className="hidden sm:block">
          <NavItems />
        </nav>
        <UserDropdown user={user} />
      </div>
    </header>
  );
};

export default Header;
