export const documentStateSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    brief: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          order: { type: "number" },
        },
      },
    },
    exportUrl: { type: "string" },
  },
} as const;
