"use client";
import { navItems } from "@/utils/constants/Constants";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toastSuccess, toastError } from "@/utils/common/Toast";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, login } = useAuth();

  const handleLoginClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await login();
      toastSuccess("Successfully logged in!");
      setIsMenuOpen(false);
    } catch (error) {
      toastError("Failed to login.");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-[rgba(212,163,89,0.25)] bg-[#0B0B0E]/90 backdrop-blur-lg">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(58,39,13,0.4),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(212,163,89,0.08),transparent_35%)] opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(58,39,13,0.3),transparent_50%),linear-gradient(240deg,rgba(212,163,89,0.06),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[rgba(212,163,89,0.4)] to-transparent" />
        <div className="relative  flex  flex-wrap items-center justify-between gap-3 px-[5vw] py-4 sm:flex-nowrap sm:gap-6  sm:py-5">
          {/* Left nav - Desktop Only */}
          <div className="hidden flex-1 items-center gap-4 text-sm text-[#A1A1AA] sm:flex sm:gap-6">
            {navItems?.slice(0, 3).map((item, index) => {
              const isSpecial = item.title === "ABHERI";
              const isHashLink = item.to.startsWith("/#");

              return (
                <Link
                  key={index}
                  href={item?.to}
                  onClick={(e) => {
                    if (isHashLink) {
                      e.preventDefault();
                      const targetId = item.to.substring(2); // Remove /#
                      const element = document.getElementById(targetId);
                      if (element) {
                        const headerOffset = 80; // Height of sticky header
                        const elementPosition =
                          element.getBoundingClientRect().top;
                        const offsetPosition =
                          elementPosition + window.pageYOffset - headerOffset;

                        window.scrollTo({
                          top: offsetPosition,
                          behavior: "smooth",
                        });
                      } else {
                        // If element not found, navigate to home first
                        window.location.href = item.to;
                      }
                    }
                  }}
                  className={`relative rounded-full border px-3.5 py-1.5 transition duration-300 ${isSpecial
                      ? "group border-[rgba(212,163,89,0.35)] bg-[rgba(212,163,89,0.1)] hover:bg-[rgba(212,163,89,0.2)] hover:border-[#F3C87A] hover:shadow-[0_0_20px_rgba(212,163,89,0.25)]"
                      : "border-transparent hover:border-[rgba(212,163,89,0.25)] hover:bg-[#131318] hover:text-[#FFFFFF]"
                    }`}
                >
                  {isSpecial ? (
                    <span className="flex items-center gap-2">
                      <span className="gold-gradient-text font-bold">
                        {item.title}
                      </span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F3C87A] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F3C87A]"></span>
                      </span>
                    </span>
                  ) : (
                    item.title
                  )}
                </Link>
              );
            })}
          </div>

          {/* Brand - Centered in Desktop */}
          <div className="flex flex-[1.2] items-center justify-start sm:justify-center">
            <Link
              href="/"
              className="relative flex items-center justify-center transition-transform hover:scale-105"
            >
              <Image
                src="/sparkz.svg"
                alt="Sparkz Logo"
                width={120}
                height={40}
                className="h-8 w-auto sm:h-10 object-contain drop-shadow-[0_0_16px_rgba(212,163,89,0.4)]"
                priority
              />
            </Link>
          </div>

          {/* Right nav + CTA - Desktop Only */}
          <div className="hidden flex-1 items-center justify-end gap-4 text-sm text-[#A1A1AA] sm:flex">
            {navItems?.slice(3, 5).map((item, index) => {
              const isSpecial = ["ABHERI", "ISRO", "ITBP"].includes(item.title);
              const isHashLink = item.to.startsWith("/#");

              return (
                <Link
                  key={index}
                  href={item?.to}
                  onClick={(e) => {
                    if (isHashLink) {
                      e.preventDefault();
                      const targetId = item.to.substring(2);
                      const element = document.getElementById(targetId);
                      if (element) {
                        const headerOffset = 80;
                        const elementPosition =
                          element.getBoundingClientRect().top;
                        const offsetPosition =
                          elementPosition + window.pageYOffset - headerOffset;

                        window.scrollTo({
                          top: offsetPosition,
                          behavior: "smooth",
                        });
                      } else {
                        window.location.href = item.to;
                      }
                    }
                  }}
                  className={`relative rounded-full border px-3.5 py-1.5 transition duration-300 ${isSpecial
                      ? "group border-[rgba(212,163,89,0.35)] bg-[rgba(212,163,89,0.1)] hover:bg-[rgba(212,163,89,0.2)] hover:border-[#F3C87A] hover:shadow-[0_0_20px_rgba(212,163,89,0.25)]"
                      : "border-transparent hover:border-[rgba(212,163,89,0.25)] hover:bg-[#131318] hover:text-[#FFFFFF]"
                    }`}
                >
                  {isSpecial ? (
                    <span className="flex items-center gap-2">
                      <span className="gold-gradient-text font-bold">
                        {item.title}
                      </span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F3C87A] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F3C87A]"></span>
                      </span>
                    </span>
                  ) : (
                    item.title
                  )}
                </Link>
              );
            })}

            {user ? (
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318] px-4 py-2 text-sm font-medium text-white transition hover:border-[#F3C87A] hover:bg-[#1b1b22]"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <UserIcon size={18} className="text-[#F3C87A]" />
                )}
                <span>Profile</span>
              </Link>
            ) : (
              <button
                onClick={handleLoginClick}
                className="btn-gold inline-flex overflow-hidden items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-[#0B0B0E] cursor-pointer"
              >
                Login
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318] text-[#F3C87A] hover:bg-[#1a1a22] transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed left-0 right-0 top-[73px] bottom-0 z-20 bg-[#0B0B0E]/95 backdrop-blur-lg transition-all duration-300 ease-in-out sm:hidden ${isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
      >
        <div className="flex h-full flex-col items-center justify-start overflow-y-auto p-6 pt-8">
          <nav className="flex flex-col items-center gap-6 w-full max-w-sm">
            {navItems?.map((item, index) => {
              const isSpecial = item.title === "ABHERI";
              const isHashLink = item.to.startsWith("/#");

              return (
                <Link
                  key={index}
                  href={item?.to}
                  onClick={(e) => {
                    if (isHashLink) {
                      e.preventDefault();
                      const targetId = item.to.substring(2);
                      const element = document.getElementById(targetId);
                      if (element) {
                        const headerOffset = 80;
                        const elementPosition =
                          element.getBoundingClientRect().top;
                        const offsetPosition =
                          elementPosition + window.pageYOffset - headerOffset;

                        window.scrollTo({
                          top: offsetPosition,
                          behavior: "smooth",
                        });
                        setIsMenuOpen(false);
                      } else {
                        window.location.href = item.to;
                      }
                    } else {
                      setIsMenuOpen(false);
                    }
                  }}
                  className={`w-full text-center py-4 text-lg font-medium rounded-2xl border transition-all hover:scale-[1.02] ${isSpecial
                      ? "text-white border-[rgba(212,163,89,0.4)] bg-[rgba(212,163,89,0.1)] shadow-[0_0_15px_rgba(212,163,89,0.2)]"
                      : "text-[#A1A1AA] border-[rgba(212,163,89,0.2)] bg-[#131318] hover:text-white hover:border-[#F3C87A]"
                    }`}
                >
                  {isSpecial ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="gold-gradient-text font-bold">
                        {item.title}
                      </span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F3C87A] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F3C87A]"></span>
                      </span>
                    </span>
                  ) : (
                    item.title
                  )}
                </Link>
              );
            })}

            {user ? (
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="w-full mt-6 py-4 text-lg font-semibold text-white rounded-2xl border border-[rgba(212,163,89,0.25)] bg-[#131318] hover:border-[#F3C87A] transition-all flex items-center justify-center gap-2"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <UserIcon size={20} className="text-[#F3C87A]" />
                )}
                Profile
              </Link>
            ) : (
              <button
                onClick={handleLoginClick}
                className="btn-gold w-full mt-6 py-4 text-lg font-bold text-[#0B0B0E] rounded-2xl transition-all hover:scale-[1.02] active:scale-95"
              >
                Login
              </button>
            )}
          </nav>

          {/* Made with Love - Tech Team */}
          <div className="mt-auto pt-8 text-center">
            <p className="text-xs text-white/40">
              <span className="text-white/70 font-semibold">Tech Team</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
