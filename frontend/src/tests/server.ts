import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/** Shared MSW server. Individual tests can override handlers with server.use(). */
export const server = setupServer(...handlers);
