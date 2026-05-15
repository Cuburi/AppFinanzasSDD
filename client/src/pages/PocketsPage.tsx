import { useEffect, useState } from "react";

import { api } from "../lib/api";
import type { PocketListFilter, SavingsPocket } from "../types";

const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

const parseOptionalAmount = (value: string): number | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
};

const pocketMatchesFilter = (pocket: SavingsPocket, filter: PocketListFilter) =>
  filter === "all" || (filter === "active" ? pocket.active : !pocket.active);

type PocketFilterButtonsProps = {
  currentFilter: PocketListFilter;
  onChange: (filter: PocketListFilter) => void;
};

const PocketFilterButtons = ({ currentFilter, onChange }: PocketFilterButtonsProps) => (
  <div className="row gap-sm wrap">
    <button className="button secondary" disabled={currentFilter === "active"} onClick={() => onChange("active")} type="button">
      Activos
    </button>
    <button className="button secondary" disabled={currentFilter === "inactive"} onClick={() => onChange("inactive")} type="button">
      Inactivos
    </button>
    <button className="button secondary" disabled={currentFilter === "all"} onClick={() => onChange("all")} type="button">
      Todos
    </button>
  </div>
);

type PocketMovementsProps = {
  pocket: SavingsPocket;
};

const PocketMovements = ({ pocket }: PocketMovementsProps) => (
  <div>
    <strong>Movimientos recientes</strong>
    {pocket.recentMovements && pocket.recentMovements.length > 0 ? (
      <ul>
        {pocket.recentMovements.map((movement) => (
          <li key={movement.id}>
            {movement.description ?? "Movimiento sin descripción"} · {movement.direction === "IN" ? "Entrada" : "Salida"} {formatMoney(movement.amount)}
          </li>
        ))}
      </ul>
    ) : (
      <p>Sin movimientos recientes.</p>
    )}
  </div>
);

export const PocketsPage = () => {
  const [filter, setFilter] = useState<PocketListFilter>("active");
  const [pockets, setPockets] = useState<SavingsPocket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPocketName, setNewPocketName] = useState("");
  const [newPocketGoal, setNewPocketGoal] = useState("");
  const [editNames, setEditNames] = useState<Record<string, string>>({});
  const [editGoals, setEditGoals] = useState<Record<string, string>>({});

  const loadPockets = async (nextFilter: PocketListFilter = filter) => {
    const nextPockets = await api.getPockets(nextFilter);
    setPockets(nextPockets);
    setEditNames(Object.fromEntries(nextPockets.map((pocket) => [pocket.id, pocket.name])));
    setEditGoals(Object.fromEntries(nextPockets.map((pocket) => [pocket.id, pocket.goalAmount?.toString() ?? ""])));
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadPockets("active");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los bolsillos.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const changeFilter = async (nextFilter: PocketListFilter) => {
    setFilter(nextFilter);
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await loadPockets(nextFilter);
    } catch (filterError) {
      setError(filterError instanceof Error ? filterError.message : "No se pudieron cargar los bolsillos.");
    } finally {
      setLoading(false);
    }
  };

  const createPocket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const createdPocket = await api.createPocket({
        name: newPocketName,
        goalAmount: parseOptionalAmount(newPocketGoal),
      });
      setPockets((current) => (filter === "inactive" ? current : [createdPocket, ...current]));
      setEditNames((current) => ({ ...current, [createdPocket.id]: createdPocket.name }));
      setEditGoals((current) => ({ ...current, [createdPocket.id]: createdPocket.goalAmount?.toString() ?? "" }));
      setNewPocketName("");
      setNewPocketGoal("");
      setMessage("Bolsillo creado como activo.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear el bolsillo.");
    } finally {
      setSubmitting(false);
    }
  };

  const updatePocket = async (pocket: SavingsPocket) => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const updatedPocket = await api.updatePocket(pocket.id, {
        name: editNames[pocket.id] ?? pocket.name,
        goalAmount: parseOptionalAmount(editGoals[pocket.id] ?? ""),
        active: pocket.active,
      });
      setPockets((current) => current.map((currentPocket) => (currentPocket.id === pocket.id ? updatedPocket : currentPocket)));
      setMessage("Bolsillo actualizado.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo actualizar el bolsillo.");
    } finally {
      setSubmitting(false);
    }
  };

  const deactivatePocket = async (pocket: SavingsPocket) => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const updatedPocket = await api.deactivatePocket(pocket.id);
      setPockets((current) =>
        current.flatMap((currentPocket) => {
          if (currentPocket.id !== pocket.id) return [currentPocket];
          return pocketMatchesFilter(updatedPocket, filter) ? [updatedPocket] : [];
        }),
      );
      setMessage("Bolsillo desactivado; queda disponible para historial.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo desactivar el bolsillo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page stack-lg">
      <header className="page-header">
        <div>
          <h1>Bolsillos</h1>
          <p>Gestioná bolsillos activos e inactivos sin borrar el historial de movimientos.</p>
        </div>
      </header>

      <article className="card stack-md">
        <h2>Crear bolsillo</h2>
        <form className="row gap-sm wrap" onSubmit={createPocket}>
          <label className="field">
            <span>Nombre del bolsillo</span>
            <input value={newPocketName} onChange={(event) => setNewPocketName(event.target.value)} required />
          </label>
          <label className="field small-field">
            <span>Meta opcional</span>
            <input min="0" step="0.01" type="number" value={newPocketGoal} onChange={(event) => setNewPocketGoal(event.target.value)} />
          </label>
          <button className="button primary" disabled={submitting} type="submit">
            Crear bolsillo
          </button>
        </form>
      </article>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <article className="card stack-md">
        <div className="row between wrap">
          <h2>Listado</h2>
          <PocketFilterButtons currentFilter={filter} onChange={(nextFilter) => void changeFilter(nextFilter)} />
        </div>

        {loading ? <p>Cargando bolsillos...</p> : null}
        {!loading && pockets.length === 0 ? <p>No hay bolsillos para este filtro.</p> : null}

        <div className="stack-sm">
          {pockets.map((pocket) => (
            <article className="budget-line align-start" key={pocket.id}>
              <div className="stack-sm grow">
                <div>
                  <strong>{pocket.name}</strong>
                  <p>{pocket.active ? "Activo" : "Inactivo"}</p>
                </div>
                <span className="pill success">Balance: {formatMoney(pocket.balance)}</span>
                <p>{pocket.goalAmount === null ? "Sin meta definida" : `Meta: ${formatMoney(pocket.goalAmount)}`}</p>

                <PocketMovements pocket={pocket} />
              </div>

              <form className="row gap-sm wrap align-start" onSubmit={(event) => event.preventDefault()}>
                <label className="field">
                  <span>Editar nombre</span>
                  <input
                    value={editNames[pocket.id] ?? pocket.name}
                    onChange={(event) => setEditNames((current) => ({ ...current, [pocket.id]: event.target.value }))}
                  />
                </label>
                <label className="field small-field">
                  <span>Editar meta</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={editGoals[pocket.id] ?? ""}
                    onChange={(event) => setEditGoals((current) => ({ ...current, [pocket.id]: event.target.value }))}
                  />
                </label>
                <button className="button primary" disabled={submitting} onClick={() => void updatePocket(pocket)} type="button">
                  Guardar cambios
                </button>
                {pocket.active ? (
                  <button className="button tertiary" disabled={submitting} onClick={() => void deactivatePocket(pocket)} type="button">
                    Desactivar
                  </button>
                ) : null}
              </form>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
};
