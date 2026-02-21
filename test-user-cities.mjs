import { getDb, getUserRoleCities } from "./server/db.ts";

const userId = 15362121;

const db = await getDb();
const result = await getUserRoleCities(userId);

console.log("User role cities data:");
console.log(JSON.stringify(result, null, 2));
