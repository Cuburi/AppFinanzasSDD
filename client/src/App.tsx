import { Link, Navigate, Route, Routes } from "react-router-dom";

import { ActiveMonthPage } from "./pages/ActiveMonthPage";
import { CloseMonthPage } from "./pages/CloseMonthPage";
import { DebtsPage } from "./pages/DebtsPage";
import { PocketsPage } from "./pages/PocketsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { TemplatePage } from "./pages/TemplatePage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <p className="eyebrow">AppFinanzas · MVP 1</p>
          <h1>Finance command center</h1>
          <p>Core monthly cycle, budgets, debt, and reporting in one premium workspace.</p>
        </div>

        <nav aria-label="Primary sections" className="nav">
          <Link to="/template">Plantilla</Link>
          <Link to="/active-month">Mes activo</Link>
          <Link to="/pockets">Bolsillos</Link>
          <Link to="/debts">Deudas</Link>
          <Link to="/close-month">Cierre</Link>
          <Link to="/reports">Reports</Link>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate replace to="/template" />} />
          <Route path="/template" element={<TemplatePage />} />
          <Route path="/active-month" element={<ActiveMonthPage />} />
          <Route path="/pockets" element={<PocketsPage />} />
          <Route path="/debts" element={<DebtsPage />} />
          <Route path="/close-month" element={<CloseMonthPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </main>
    </div>
  );
}
