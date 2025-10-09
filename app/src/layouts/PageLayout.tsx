import { Link, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { NetworkSwitcher } from "../components/presale/NetworkSwitcher";

type PageLayoutProps = {
  children: ReactNode;
};

const NAV_LINKS = [
  { label: "Presale", href: "/presale" },
  { label: "Presale Admin", href: "/admin/presale" },
  { label: "Token Ops", href: "/admin/token" },
  { label: "Reports", href: "/admin/reports" },
];

export const PageLayout = ({ children }: PageLayoutProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-10">
            <Link to="/presale" className="font-semibold text-xl tracking-tight">
              Dollar Token Presale
            </Link>
            <nav className="hidden gap-6 md:flex text-sm">
              {NAV_LINKS.map((nav) => (
                <Link
                  key={nav.href}
                  to={nav.href}
                  className={`uppercase tracking-wide transition ${
                    location.pathname === nav.href
                      ? "text-brand-300"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {nav.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NetworkSwitcher />
            <WalletMultiButton className="!bg-brand-500 hover:!bg-brand-400" />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">{children}</div>
      </main>
      <footer className="border-t border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Dollar Token Labs. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">
              Twitter
            </a>
            <a href="mailto:team@dollartoken.io">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
