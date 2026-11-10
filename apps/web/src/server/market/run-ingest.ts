import { getDb } from "../db/client";
import { runIngest } from "./ingest";

/** Ejecuta la ingesta desde la terminal: npm run ingest */
runIngest(getDb())
  .then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failures.length > 0) process.exitCode = 1;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
