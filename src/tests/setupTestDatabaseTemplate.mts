import { PGlite } from "@electric-sql/pglite";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "src/tests/databases");

execSync(`rm -fr ${dbPath}`);
execSync(`mkdir ${dbPath}`);

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/generated.sql"),
  "utf8",
);

const pglite = new PGlite();

await pglite.exec(migration);

const dump = await pglite.dumpDataDir("none");
const buffer = await dump.arrayBuffer();

fs.writeFileSync(
  path.join(process.cwd(), "src/tests/databases/pglite"),
  new DataView(buffer),
);
