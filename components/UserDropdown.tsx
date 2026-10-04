"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth.actions";
import { toast } from "sonner";
import { useLanguage } from "./LanguageProvider";
import LanguageToggle from "./LanguageToggle";
import { InstallAppButton } from "./PwaProvider";

const UserDropdown = ({ user }: { user: User }) => {
  const router = useRouter();
  const { dictionary } = useLanguage();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      router.push("/sign-in");
    }else{
      toast.error(result.error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={dictionary.daily.account}
          className="flex items-center gap-3 text-gray-4 hover:text-yellow-500"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
              {user.name?.[0] || "S"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden lg:flex flex-col items-center">
            <span className="text-base font-medium text-gray-400">
              {user.name}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="text-gray-400">
        <DropdownMenuLabel>
          <div className="flex relative items-center gap-3 py-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                {user.name?.[0] || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-base font-medium text-gray-400">
                {user.name}
              </span>
              <span className="text-sm text-gray-500">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-600" />
      <DropdownMenuItem onClick={handleSignOut} className="text-md text-gray-100 font-medium focus:text-yellow-500 transition-colors cursor-pointer">
        <LogOut className="h-4 w-4 mr-2 hidden sm:block" /> {dictionary.userMenu.logout}
      </DropdownMenuItem>
      <DropdownMenuSeparator className="hidden sm:block bg-gray-600" />
      <div className="px-2 py-2 md:hidden">
        <LanguageToggle className="w-full justify-center" />
      </div>
      <div className="px-2 py-2"><InstallAppButton /></div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
