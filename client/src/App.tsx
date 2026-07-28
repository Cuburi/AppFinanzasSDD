import { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import { ActiveMonthPage } from "./pages/ActiveMonthPage";
import { CloseMonthPage } from "./pages/CloseMonthPage";
import { CreditCardsPage } from "./pages/CreditCardsPage";
import { DebtsPage } from "./pages/DebtsPage";
import { PocketsPage } from "./pages/PocketsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { TemplatePage } from "./pages/TemplatePage";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const desktopQuery = window.matchMedia("(min-width: 1120px)");
    const closeMenuOnDesktop = ({ matches }: Pick<MediaQueryListEvent, "matches">) => {
      if (matches) setMenuOpen(false);
    };

    closeMenuOnDesktop(desktopQuery);
    desktopQuery.addEventListener("change", closeMenuOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeMenuOnDesktop);
  }, []);

  useEffect(() => {
    const dialog = menuDialogRef.current;
    if (!dialog) return;

    if (menuOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      dialog.focus();
      return;
    }

    if (!menuOpen && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      menuTriggerRef.current?.focus();
    }
  }, [menuOpen]);

  const navigationLinks = (onNavigate?: () => void) => (
    <>
      <NavLink onClick={onNavigate} to="/active-month">Mes activo</NavLink>
      <NavLink onClick={onNavigate} to="/template">Plantilla</NavLink>
      <NavLink onClick={onNavigate} to="/pockets">Bolsillos</NavLink>
      <NavLink onClick={onNavigate} to="/debts">Deudas</NavLink>
      <NavLink onClick={onNavigate} to="/credit-cards">Tarjetas de crédito</NavLink>
      <NavLink onClick={onNavigate} to="/close-month">Cierre</NavLink>
      <NavLink onClick={onNavigate} to="/reports">Reportes</NavLink>
    </>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <p className="app-brand-name">AppFinanzas</p>
          <p className="eyebrow">Finanzas personales</p>
        </div>

        <nav aria-label="Navegación principal" className="nav">
          {navigationLinks()}
        </nav>

        <button
          aria-controls="app-navigation-drawer"
          aria-expanded={menuOpen}
          className="menu-trigger"
          onClick={() => setMenuOpen(true)}
          ref={menuTriggerRef}
          type="button"
        >
          Menú
        </button>
      </header>

      <dialog
        aria-label="Navegación principal"
        className="navigation-drawer"
        id="app-navigation-drawer"
        onCancel={(event) => {
          event.preventDefault();
          setMenuOpen(false);
        }}
        ref={menuDialogRef}
        tabIndex={-1}
      >
        <div className="navigation-drawer-header">
          <p className="app-brand-name">AppFinanzas</p>
          <button className="button secondary" onClick={() => setMenuOpen(false)} type="button">Cerrar menú</button>
        </div>
        <nav aria-label="Navegación principal del menú">
          {navigationLinks(() => setMenuOpen(false))}
        </nav>
      </dialog>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate replace to="/active-month" />} />
          <Route path="/template" element={<TemplatePage />} />
          <Route path="/active-month" element={<ActiveMonthPage />} />
          <Route path="/pockets" element={<PocketsPage />} />
          <Route path="/debts" element={<DebtsPage />} />
          <Route path="/credit-cards" element={<CreditCardsPage />} />
          <Route path="/close-month" element={<CloseMonthPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </main>
    </div>
  );
}
