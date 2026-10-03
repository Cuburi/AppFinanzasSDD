import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { formatCop, normalizeAmountInput, parseAmountInput } from "../lib/money";
import { Button, Card, SectionHeader, StatusPill } from "../components/ui";
import type { PocketListFilter, SavingsPocket } from "../types";
import { PocketRecentMovements } from "../features/pockets/components/PocketRecentMovements";

const formatMoney = formatCop;

const parseOptionalAmount = (value: string): number | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : parseAmountInput(trimmed);
};

const localCalendarDate = (date = new Date()) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const pocketMatchesFilter = (pocket: SavingsPocket, filter: PocketListFilter) =>
  filter === "all" || (filter === "active" ? pocket.active : !pocket.active);

type PocketFilterButtonsProps = {
  currentFilter: PocketListFilter;
  onChange: (filter: PocketListFilter) => void;
};

const PocketFilterButtons = ({ currentFilter, onChange }: PocketFilterButtonsProps) => (
  <div className="row gap-sm wrap">
    <Button variant="secondary" disabled={currentFilter === "active"} onClick={() => onChange("active")} type="button">
      Activos
    </Button>
    <Button variant="secondary" disabled={currentFilter === "inactive"} onClick={() => onChange("inactive")} type="button">
      Inactivos
    </Button>
    <Button variant="secondary" disabled={currentFilter === "all"} onClick={() => onChange("all")} type="button">
      Todos
    </Button>
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
  const [newPocketInitialBalance, setNewPocketInitialBalance] = useState("");
  const [editNames, setEditNames] = useState<Record<string, string>>({});
  const [editGoals, setEditGoals] = useState<Record<string, string>>({});
  const [externalPocketId, setExternalPocketId] = useState("");
  const [externalAmount, setExternalAmount] = useState("");
  const [externalOccurredAt, setExternalOccurredAt] = useState(localCalendarDate);
  const [externalSourceLabel, setExternalSourceLabel] = useState("");
  const [withdrawalPocketId, setWithdrawalPocketId] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalOccurredAt, setWithdrawalOccurredAt] = useState(localCalendarDate);
  const [withdrawalDescription, setWithdrawalDescription] = useState("");

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

  const retryPockets = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadPockets(filter);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los bolsillos.");
    } finally {
      setLoading(false);
    }
  };

  const createPocket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const initialBalance = parseOptionalAmount(newPocketInitialBalance);

    if (initialBalance !== null && (!Number.isFinite(initialBalance) || initialBalance < 0)) {
      setError("El saldo inicial debe ser un número mayor o igual a cero.");
      return;
    }

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
      setNewPocketInitialBalance("");

      if (!initialBalance) {
        setMessage("Bolsillo creado como activo.");
        return;
      }

      try {
        await api.depositExternalToPocket({
          sourceKind: "EXTERNAL",
          targetPocketId: createdPocket.id,
          amount: initialBalance,
          occurredAt: localCalendarDate(),
          externalSourceLabel: "Saldo inicial",
        });
      } catch (depositError) {
        const detail = depositError instanceof Error ? ` ${depositError.message}` : "";
        setMessage("Bolsillo creado como activo, pero no se pudo registrar el saldo inicial.");
        setError(`El bolsillo fue creado, pero no se pudo registrar el saldo inicial.${detail}`);
        return;
      }

      try {
        await loadPockets(filter);
        setMessage("Bolsillo creado con saldo inicial.");
      } catch (refreshError) {
        const detail = refreshError instanceof Error ? ` ${refreshError.message}` : "";
        setMessage("Bolsillo creado y saldo inicial registrado.");
        setError(`El bolsillo fue creado y el saldo inicial se registró, pero no se pudieron actualizar los bolsillos.${detail}`);
      }
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

  const registerExternalDeposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await api.depositExternalToPocket({
        sourceKind: "EXTERNAL",
        targetPocketId: externalPocketId,
        amount: parseAmountInput(externalAmount),
        occurredAt: externalOccurredAt,
        ...(externalSourceLabel.trim() ? { externalSourceLabel: externalSourceLabel.trim() } : {}),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el ingreso externo.");
      setSubmitting(false);
      return;
    }

    setExternalPocketId("");
    setExternalAmount("");
    setExternalSourceLabel("");
    setMessage("Ingreso externo registrado.");

    try {
      await loadPockets(filter);
    } catch (refreshError) {
      const detail = refreshError instanceof Error ? ` ${refreshError.message}` : "";
      setError(`El ingreso externo se registró, pero no se pudieron actualizar los bolsillos.${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const registerPocketWithdrawal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await api.withdrawFromPocket({
        sourcePocketId: withdrawalPocketId,
        amount: parseAmountInput(withdrawalAmount),
        occurredAt: withdrawalOccurredAt,
        ...(withdrawalDescription.trim() ? { description: withdrawalDescription.trim() } : {}),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el retiro del bolsillo.");
      setSubmitting(false);
      return;
    }

    setWithdrawalPocketId("");
    setWithdrawalAmount("");
    setWithdrawalDescription("");
    setMessage("Retiro o gasto del bolsillo registrado.");

    try {
      await loadPockets(filter);
    } catch (refreshError) {
      const detail = refreshError instanceof Error ? ` ${refreshError.message}` : "";
      setError(`El retiro o gasto se registró, pero no se pudieron actualizar los bolsillos.${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page stack-lg pockets-page">
      <SectionHeader title="Bolsillos" description="Creá, fondeá y usá tus bolsillos sin perder el historial de cada movimiento." />

      <Card aria-label="Crear bolsillo" className="stack-md pockets-create-card">
        <div className="pockets-card-heading">
          <div>
            <p className="eyebrow">Nuevo bolsillo</p>
            <h2>Crear bolsillo</h2>
          </div>
          <p>Definí una meta y, si lo necesitás, empezá con un saldo inicial.</p>
        </div>
        <form className="pockets-create-form" onSubmit={createPocket}>
          <label className="field">
            <span>Nombre del bolsillo</span>
            <input value={newPocketName} onChange={(event) => setNewPocketName(event.target.value)} required />
          </label>
          <label className="field small-field">
            <span>Meta opcional</span>
            <input min="0" step="0.01" type="number" value={newPocketGoal} onChange={(event) => setNewPocketGoal(normalizeAmountInput(event.target.value))} />
          </label>
          <label className="field small-field">
            <span>Saldo inicial</span>
            <input min="0" step="0.01" type="number" value={newPocketInitialBalance} onChange={(event) => setNewPocketInitialBalance(normalizeAmountInput(event.target.value))} />
          </label>
          <Button disabled={submitting} type="submit">
            Crear bolsillo
          </Button>
        </form>
      </Card>

      <div className="pockets-action-grid">
        <Card aria-label="Registrar ingreso externo" className="stack-md pockets-action-card pockets-deposit-card">
          <div className="pockets-card-heading">
            <div>
              <p className="eyebrow">Agregar dinero</p>
              <h2>Registrar ingreso externo</h2>
            </div>
            <p>Sumá dinero que no se descuenta del presupuesto mensual.</p>
          </div>
          <form className="pockets-action-form" onSubmit={registerExternalDeposit}>
            <label className="field">
            <span>Bolsillo destino</span>
            <select disabled={loading || submitting} value={externalPocketId} onChange={(event) => setExternalPocketId(event.target.value)} required>
              <option value="">Seleccioná un bolsillo activo</option>
              {pockets.filter((pocket) => pocket.active).map((pocket) => <option key={pocket.id} value={pocket.id}>{pocket.name} ({formatMoney(pocket.balance)})</option>)}
            </select>
          </label>
          <label className="field small-field">
            <span>Monto del ingreso externo</span>
            <input disabled={submitting} min="0.01" step="0.01" type="number" value={externalAmount} onChange={(event) => setExternalAmount(normalizeAmountInput(event.target.value))} required />
          </label>
          <label className="field small-field">
            <span>Fecha del ingreso externo</span>
            <input disabled={submitting} type="date" value={externalOccurredAt} onChange={(event) => setExternalOccurredAt(event.target.value)} required />
          </label>
          <label className="field">
            <span>Origen externo (opcional)</span>
            <input disabled={submitting} value={externalSourceLabel} onChange={(event) => setExternalSourceLabel(event.target.value)} />
          </label>
            <Button disabled={loading || submitting || pockets.filter((pocket) => pocket.active).length === 0} type="submit">Registrar ingreso externo</Button>
          </form>
        </Card>

        <Card aria-label="Registrar retiro o gasto" className="stack-md pockets-action-card pockets-withdrawal-card">
          <div className="pockets-card-heading">
            <div>
              <p className="eyebrow">Usar dinero</p>
              <h2>Registrar retiro o gasto</h2>
            </div>
            <p>Descuenta el saldo del bolsillo, sin afectar el presupuesto mensual.</p>
          </div>
          <form className="pockets-action-form" onSubmit={registerPocketWithdrawal}>
            <label className="field">
            <span>Bolsillo de origen</span>
            <select disabled={loading || submitting} value={withdrawalPocketId} onChange={(event) => setWithdrawalPocketId(event.target.value)} required>
              <option value="">Seleccioná un bolsillo activo</option>
              {pockets.filter((pocket) => pocket.active).map((pocket) => <option key={pocket.id} value={pocket.id}>{pocket.name} ({formatMoney(pocket.balance)})</option>)}
            </select>
          </label>
          <label className="field small-field">
            <span>Monto del retiro o gasto</span>
            <input disabled={submitting} min="0.01" step="0.01" type="number" value={withdrawalAmount} onChange={(event) => setWithdrawalAmount(normalizeAmountInput(event.target.value))} required />
          </label>
          <label className="field small-field">
            <span>Fecha del retiro o gasto</span>
            <input disabled={submitting} type="date" value={withdrawalOccurredAt} onChange={(event) => setWithdrawalOccurredAt(event.target.value)} required />
          </label>
          <label className="field">
            <span>Descripción (opcional)</span>
            <input disabled={submitting} value={withdrawalDescription} onChange={(event) => setWithdrawalDescription(event.target.value)} />
          </label>
            <Button disabled={loading || submitting || pockets.filter((pocket) => pocket.active).length === 0} type="submit">Registrar retiro o gasto</Button>
          </form>
        </Card>
      </div>

      {message ? <p className="success">{message}</p> : null}
      {error ? <div className="stack-sm" role="alert"><p className="error">{error}</p><Button onClick={() => void retryPockets()} type="button" variant="tertiary">Reintentar bolsillos</Button></div> : null}

      <Card aria-label="Listado de bolsillos" className="stack-md">
        <div className="row between wrap">
          <h2>Listado</h2>
          <PocketFilterButtons currentFilter={filter} onChange={(nextFilter) => void changeFilter(nextFilter)} />
        </div>

        {loading ? <p aria-live="polite" role="status">Cargando bolsillos...</p> : null}
        {!loading && pockets.length === 0 ? <p>No hay bolsillos para este filtro.</p> : null}

        <div className="stack-sm">
          {pockets.map((pocket) => (
            <article className="budget-line align-start pocket-card" key={pocket.id}>
              <div className="stack-sm grow pocket-card-summary">
                <div className="pocket-card-title">
                  <div>
                    <p className="eyebrow">Bolsillo</p>
                    <h3>{pocket.name}</h3>
                  </div>
                  <StatusPill tone={pocket.active ? "success" : "neutral"}>{pocket.active ? "Activo" : "Inactivo"}</StatusPill>
                </div>
                <div className="pocket-card-balance">
                  <span>Saldo disponible</span>
                  <strong>{formatMoney(pocket.balance)}</strong>
                  <StatusPill tone={pocket.balance > 0 ? "success" : "neutral"} aria-label={`${pocket.balance > 0 ? "Success" : "Neutral"}: Balance ${formatMoney(pocket.balance)}`}>
                    Balance: {formatMoney(pocket.balance)}
                  </StatusPill>
                </div>
                <p className="pocket-card-goal">{pocket.goalAmount === null ? "Sin meta definida" : `Meta: ${formatMoney(pocket.goalAmount)}`}</p>

                <PocketRecentMovements movements={pocket.recentMovements ?? []} />
              </div>

              <form className="pocket-edit-form" onSubmit={(event) => event.preventDefault()}>
                <div>
                  <p className="eyebrow">Configuración</p>
                  <h4>Editar bolsillo</h4>
                </div>
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
                    onChange={(event) => setEditGoals((current) => ({ ...current, [pocket.id]: normalizeAmountInput(event.target.value) }))}
                  />
                </label>
                <Button disabled={submitting} onClick={() => void updatePocket(pocket)} type="button">
                  Guardar cambios
                </Button>
                {pocket.active ? (
                  <Button variant="tertiary" disabled={submitting} onClick={() => void deactivatePocket(pocket)} type="button">
                    Desactivar
                  </Button>
                ) : null}
              </form>
            </article>
          ))}
        </div>
      </Card>
    </section>
  );
};
