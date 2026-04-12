import { useUser } from "@clerk/react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, LogOut, CreditCard, Settings } from "lucide-react";
import { useClerk } from "@clerk/react";

export function UserMenu() {
  const { user: clerkUser } = useUser();
  const { tier, signOut } = useAuth();
  const { openUserProfile } = useClerk();
  const navigate = useNavigate();

  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  const name = clerkUser?.firstName
    ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ""}`
    : null;
  const imageUrl = clerkUser?.imageUrl;
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() ?? "?";

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const tierColor = tier === "pro" ? "text-primary" : tier === "plus" ? "text-primary" : "text-muted-foreground";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-7 h-7 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-medium ring-1 ring-border">
              {initials}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            {name && <p className="text-sm font-medium leading-none">{name}</p>}
            {email && (
              <p className="text-xs leading-none text-muted-foreground truncate">{email}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Crown className={`w-3 h-3 ${tierColor}`} />
              <span className={`text-xs font-medium ${tierColor}`}>{tierLabel} plan</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => openUserProfile()}
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage account
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => navigate("/pricing")}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {tier === "free" ? "Upgrade plan" : "Manage plan"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
