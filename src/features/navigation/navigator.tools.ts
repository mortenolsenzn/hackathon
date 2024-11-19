import { Type } from "@sinclair/typebox"
import { Tool } from "../../copilot/types/types.js";

const ports: Record<string, unknown> = {
  SGP: {
    lat: 1.2593655,
    lon: 103.75445,
  },
};

const getPortInputSchema = Type.Object({
  code: Type.String({
    description: 'Port code',
  })
});

const getPort: Tool<typeof getPortInputSchema> = {
  input: getPortInputSchema,
  description: 'Convert a port code to a location',
  handle: async (input) => {
    return ports[input.code] || 'unknown';
  }
};

export { getPort };
