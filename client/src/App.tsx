import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import { ActiveMonthPage } from "./pages/ActiveMonthPage";
import { CloseMonthPage } from "./pages/CloseMonthPage";
import { CreditCardsPage } from "./pages/CreditCardsPage";
import { DebtsPage } from "./pages/DebtsPage";
import { PocketsPage } from "./pages/PocketsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { TemplatePage } from "./pages/TemplatePage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <p className="app-brand-name">AppFinanzas</p>
          <p className="eyebrow">Finanzas personales</p>
        </div>

        <nav aria-label="Navegación principal" className="nav">
          <NavLink to="/template">Plantilla</NavLink>
          <NavLink to="/active-month">Mes activo</NavLink>
          <NavLink to="/pockets">Bolsillos</NavLink>
          <NavLink to="/debts">Deudas</NavLink>
          <NavLink to="/credit-cards">Tarjetas de crédito</NavLink>
          <NavLink to="/close-month">Cierre</NavLink>
          <NavLink to="/reports">Reportes</NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate replace to="/template" />} />
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
