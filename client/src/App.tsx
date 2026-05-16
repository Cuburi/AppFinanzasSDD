import { Link, Navigate, Route, Routes } from "react-router-dom";

import { ActiveMonthPage } from "./pages/ActiveMonthPage";
import { CloseMonthPage } from "./pages/CloseMonthPage";
import { PocketsPage } from "./pages/PocketsPage";
import { TemplatePage } from "./pages/TemplatePage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AppFinanzas · MVP 1</p>
          <h1>Core Monthly Cycle</h1>
        </div>

        <nav className="nav">
          <Link to="/template">Plantilla</Link>
          <Link to="/active-month">Mes activo</Link>
          <Link to="/pockets">Bolsillos</Link>
          <Link to="/close-month">Cierre</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Navigate replace to="/template" />} />
          <Route path="/template" element={<TemplatePage />} />
          <Route path="/active-month" element={<ActiveMonthPage />} />
          <Route path="/pockets" element={<PocketsPage />} />
          <Route path="/close-month" element={<CloseMonthPage />} />
        </Routes>
      </main>
    </div>
  );
}
