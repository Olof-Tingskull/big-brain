import { db, end } from "../lib/db.js";
import { chunks, subjects, chunkSubjects } from "../lib/schema.js";
import "dotenv/config";

async function main() {
  console.log("Clearing all data...");

  await db.delete(chunkSubjects);
  await db.delete(chunks);
  await db.delete(subjects);

  console.log("Done — all chunks, subjects, and links deleted.");
  await end();
}

main();
