export const subGraphs = {
  internal: {
    pathname: "/internal-graphql",
  },
  partner: {
    pathname: "/partner-graphql",
  },
};

export type SubGraph = keyof typeof subGraphs;
