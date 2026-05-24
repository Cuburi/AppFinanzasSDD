import { describe, expect, it } from "vitest";

import { routerFutureFlags } from "./router-future-flags";

describe("routerFutureFlags", () => {
  it("opts into React Router v7 future behavior used by app and test routers", () => {
    expect(routerFutureFlags).toEqual({
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    });
  });
});
