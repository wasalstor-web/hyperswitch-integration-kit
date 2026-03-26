import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

/**
 * USE_PGLITE=true — Postgres مضمّن (بدون Docker) عبر PGlite.
 * وإلا يُستخدم DATABASE_URL مع Prisma العادي (Docker / Neon / …).
 */
export async function initDatabase(): Promise<PrismaClient> {
  const usePglite =
    process.env.USE_PGLITE === "true" ||
    process.env.USE_PGLITE === "1" ||
    process.env.DATABASE_URL?.trim().startsWith("pglite:");

  if (usePglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto");
    const { PrismaPGlite } = await import("pglite-prisma-adapter");

    const rel = (process.env.PGLITE_DATA_DIR ?? ".data/pglite").replace(/^["']|["']$/g, "");
    const dataDir = join(process.cwd(), rel);
    mkdirSync(dataDir, { recursive: true });

    const engine = new PGlite(dataDir, {
      extensions: { pgcrypto },
    });
    await engine.waitReady;
    await ensurePgliteMigrations(engine);

    // PGlite/adapter يُستوردان ديناميكياً؛ TypeScript يرى نسختين من أنواع PGlite (import vs require).
    const adapter = new PrismaPGlite(engine as never);
    console.log(`[db] PGlite جاهز في ${dataDir}`);
    return new PrismaClient({ adapter: adapter as never });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    console.warn(
      "[db] DATABASE_URL غير مضبوط. للتشغيل بدون Docker: USE_PGLITE=true في .env",
    );
  }
  return new PrismaClient();
}

/** يتجنب تعارض أنواع PGlite بين الاستيراد الثابت والديناميكي في tsc */
type PgliteForMigrations = {
  exec(query: string): Promise<unknown>;
  query<T = { [key: string]: unknown }>(
    query: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
};

async function ensurePgliteMigrations(engine: PgliteForMigrations): Promise<void> {
  try {
    await engine.query('SELECT 1 FROM "onboarding_sessions" LIMIT 1');
    console.log("[db] PGlite: الجداول موجودة — تخطي الهجرات");
    return;
  } catch {
    /* أول تشغيل */
  }

  const migrationsRoot = join(process.cwd(), "prisma", "migrations");
  const dirs = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const dir of dirs) {
    const sqlPath = join(migrationsRoot, dir, "migration.sql");
    if (!existsSync(sqlPath)) continue;
    const sql = readFileSync(sqlPath, "utf8");
    await engine.exec(sql);
    console.log(`[db] PGlite: طُبّقت ${dir}`);
  }
}
