import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

// Website-local settings; never change the shared competition_programs rows.
const settingsPath = path.join(process.env.COMPETITION_SITE_DATA_DIR || path.join(process.cwd(), "data", "site-settings"), "hidden-competitions.json");
let writes: Promise<void> = Promise.resolve();
export async function siteHiddenCompetitionIds(): Promise<Set<string>> {
  try {
    const ids: unknown = JSON.parse(await readFile(settingsPath, "utf8"));
    if (!Array.isArray(ids) || ids.some(id => typeof id !== "string")) throw new Error("Invalid competition visibility settings");
    return new Set(ids);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Set();
    throw error;
  }
}
export async function setCompetitionSiteHidden(id: string, hidden: boolean) {
  const operation = writes.then(async () => {
    const ids = await siteHiddenCompetitionIds();
    if (hidden) ids.add(id); else ids.delete(id);
    await mkdir(path.dirname(settingsPath), { recursive: true });
    const temporary = settingsPath + ".tmp";
    await writeFile(temporary, JSON.stringify([...ids]), "utf8");
    await rename(temporary, settingsPath);
  });
  writes = operation.catch(() => {});
  await operation;
}
