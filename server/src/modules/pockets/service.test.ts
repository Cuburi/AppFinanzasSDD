import test from "node:test";
import assert from "node:assert/strict";
import { MovementType, Prisma } from "@prisma/client";

import { createPocketsService, DomainError } from "./service.js";

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

type MovementFixture = {
  id: string;
  type: MovementType;
  amount: Prisma.Decimal;
  occurredAt: Date;
  description: string | null;
  sourcePocketId: string | null;
  targetPocketId: string | null;
};

type PocketFixture = {
  id: string;
  name: string;
  goalAmount: Prisma.Decimal | null;
  active: boolean;
  incomingMovements: MovementFixture[];
  outgoingMovements: MovementFixture[];
};

const createPocketDbStub = () => {
  let nextId = 1;
  const pockets: PocketFixture[] = [
    {
      id: "pocket-emergency",
      name: "Emergencias",
      goalAmount: money(1000),
      active: true,
      incomingMovements: [
        {
          id: "movement-in-1",
          type: MovementType.POCKET_DEPOSIT_EXTERNAL,
          amount: money(250),
          occurredAt: new Date("2026-05-10T00:00:00.000Z"),
          description: "Reserva inicial",
          sourcePocketId: null,
          targetPocketId: "pocket-emergency",
        },
        {
          id: "movement-in-2",
          type: MovementType.SURPLUS_TO_POCKET_ON_CLOSE,
          amount: money(75),
          occurredAt: new Date("2026-05-12T00:00:00.000Z"),
          description: "Sobrante",
          sourcePocketId: null,
          targetPocketId: "pocket-emergency",
        },
      ],
      outgoingMovements: [
        {
          id: "movement-out-1",
          type: MovementType.DEFICIT_COVER_FROM_POCKET,
          amount: money(50),
          occurredAt: new Date("2026-05-13T00:00:00.000Z"),
          description: "Cobertura",
          sourcePocketId: "pocket-emergency",
          targetPocketId: null,
        },
      ],
    },
    {
      id: "pocket-vacation",
      name: "Vacaciones",
      goalAmount: null,
      active: false,
      incomingMovements: [
        {
          id: "movement-vacation",
          type: MovementType.POCKET_DEPOSIT_EXTERNAL,
          amount: money(500),
          occurredAt: new Date("2026-04-01T00:00:00.000Z"),
          description: "Histórico",
          sourcePocketId: null,
          targetPocketId: "pocket-vacation",
        },
      ],
      outgoingMovements: [],
    },
  ];

  const clonePocket = (pocket: PocketFixture): PocketFixture => ({
    ...pocket,
    goalAmount: pocket.goalAmount ? money(Number(pocket.goalAmount.toString())) : null,
    incomingMovements: pocket.incomingMovements.map((movement) => ({ ...movement, amount: money(Number(movement.amount.toString())) })),
    outgoingMovements: pocket.outgoingMovements.map((movement) => ({ ...movement, amount: money(Number(movement.amount.toString())) })),
  });

  const findById = (id: string) => pockets.find((pocket) => pocket.id === id) ?? null;
  const findByName = (name: string) => pockets.find((pocket) => pocket.name.toLocaleLowerCase() === name.toLocaleLowerCase()) ?? null;

  const db: any = {
    savingsPocket: {
      async findMany(args: { where?: { active?: boolean }; orderBy?: unknown }) {
        return pockets.filter((pocket) => args.where?.active === undefined || pocket.active === args.where.active).map(clonePocket);
      },
      async findUnique(args: { where: { id?: string; name?: string } }) {
        const found = args.where.id ? findById(args.where.id) : args.where.name ? findByName(args.where.name) : null;
        return found ? clonePocket(found) : null;
      },
      async create(args: { data: { name: string; goalAmount: Prisma.Decimal | null; active?: boolean } }) {
        const pocket: PocketFixture = {
          id: `pocket-${nextId++}`,
          name: args.data.name,
          goalAmount: args.data.goalAmount,
          active: args.data.active ?? true,
          incomingMovements: [],
          outgoingMovements: [],
        };
        pockets.push(pocket);
        return clonePocket(pocket);
      },
      async update(args: { where: { id: string }; data: { name?: string; goalAmount?: Prisma.Decimal | null; active?: boolean } }) {
        const pocket = findById(args.where.id);
        if (!pocket) throw new Error("Pocket missing in stub.");
        if (args.data.name !== undefined) pocket.name = args.data.name;
        if (args.data.goalAmount !== undefined) pocket.goalAmount = args.data.goalAmount;
        if (args.data.active !== undefined) pocket.active = args.data.active;
        return clonePocket(pocket);
      },
    },
  };

  return { db, pockets };
};

test("listPockets filters by active state and returns current balance", async () => {
  const { db } = createPocketDbStub();
  const service = createPocketsService(db);

  const result = await service.listPockets({ active: true });

  assert.equal(result.pockets.length, 1);
  assert.equal(result.pockets[0]?.id, "pocket-emergency");
  assert.equal(result.pockets[0]?.active, true);
  assert.equal(result.pockets[0]?.balance, 275);
});

test("listPockets can include inactive pockets without hard-deleting movement history", async () => {
  const { db } = createPocketDbStub();
  const service = createPocketsService(db);

  const result = await service.listPockets({ active: "all" });

  assert.deepEqual(
    result.pockets.map((pocket) => ({ id: pocket.id, active: pocket.active, balance: pocket.balance })),
    [
      { id: "pocket-emergency", active: true, balance: 275 },
      { id: "pocket-vacation", active: false, balance: 500 },
    ],
  );
});

test("createPocket creates active pockets and rejects duplicate names", async () => {
  const { db } = createPocketDbStub();
  const service = createPocketsService(db);

  const created = await service.createPocket({ name: "Auto", goalAmount: 2000 });

  assert.equal(created.name, "Auto");
  assert.equal(created.goalAmount, 2000);
  assert.equal(created.active, true);
  assert.equal(created.balance, 0);
  await assert.rejects(() => service.createPocket({ name: "emergencias", goalAmount: null }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /already exists/i);
    return true;
  });
});

test("updatePocket changes editable fields and deactivatePocket keeps the record inactive", async () => {
  const { db } = createPocketDbStub();
  const service = createPocketsService(db);

  const updated = await service.updatePocket("pocket-emergency", { name: "Emergencias reales", goalAmount: null });
  const deactivated = await service.deactivatePocket("pocket-emergency");
  const inactiveList = await service.listPockets({ active: false });

  assert.equal(updated.name, "Emergencias reales");
  assert.equal(updated.goalAmount, null);
  assert.equal(deactivated.id, "pocket-emergency");
  assert.equal(deactivated.active, false);
  assert.equal(inactiveList.pockets.some((pocket) => pocket.id === "pocket-emergency" && pocket.balance === 275), true);
});

test("getPocket returns balance and recent movements for pocket detail visibility", async () => {
  const { db } = createPocketDbStub();
  const service = createPocketsService(db);

  const pocket = await service.getPocket("pocket-emergency");

  assert.equal(pocket.id, "pocket-emergency");
  assert.equal(pocket.balance, 275);
  assert.deepEqual(
    pocket.recentMovements.map((movement) => ({ id: movement.id, amount: movement.amount, direction: movement.direction })),
    [
      { id: "movement-out-1", amount: 50, direction: "out" },
      { id: "movement-in-2", amount: 75, direction: "in" },
      { id: "movement-in-1", amount: 250, direction: "in" },
    ],
  );
});
