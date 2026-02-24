"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { cn } from "@/lib/utils";
import { Sparkles, TrendingUp, PlusCircle, User } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: TrendingUp },
  { href: "/create", label: "Create", icon: PlusCircle },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-dark-950/80 backdrop-blur-lg border-b border-dark-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-claw-500 rounded-lg flex items-center justify-center glow-green">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              <span className="text-white">CLAW</span>
              <span className="text-claw-500">.FUN</span>
            </span>
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-dark-800 text-claw-400"
                      : "text-dark-300 hover:text-white hover:bg-dark-800/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet */}
          <div className="flex items-center gap-4">
            <WalletMultiButton className="!bg-claw-600 hover:!bg-claw-700 !rounded-lg !h-10 !text-sm !font-medium" />
          </div>
        </div>
      </div>
    </nav>
  );
}
