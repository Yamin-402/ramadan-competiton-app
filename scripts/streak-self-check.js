import { prisma } from "../src/core/db/prisma.js";

const strictMode = process.argv.includes("--strict");

function getConfigShape(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      hasStreakEnabled: false,
      streakEnabled: false,
      malformed: false,
      rawValue: undefined,
    };
  }

  const hasStreakEnabled = Object.prototype.hasOwnProperty.call(config, "streakEnabled");
  if (!hasStreakEnabled) {
    return {
      hasStreakEnabled: false,
      streakEnabled: false,
      malformed: false,
      rawValue: undefined,
    };
  }

  const rawValue = config.streakEnabled;
  const malformed = typeof rawValue !== "boolean";

  return {
    hasStreakEnabled: true,
    streakEnabled: rawValue === true,
    malformed,
    rawValue,
  };
}

function isStreakEnabled(type, configShape) {
  return type === "STREAK" || configShape.streakEnabled;
}

function printTaskRows(title, rows, formatter) {
  if (rows.length === 0) {
    return;
  }

  console.log(`\n${title} (${rows.length})`);
  for (const row of rows) {
    console.log(`- ${formatter(row)}`);
  }
}

try {
  const [tasks, streakGroups] = await Promise.all([
    prisma.task.findMany({
      select: {
        id: true,
        key: true,
        title: true,
        type: true,
        status: true,
        config: true,
      },
      orderBy: [{ id: "asc" }],
    }),
    prisma.streak.groupBy({
      by: ["taskId"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const streakCountByTaskId = new Map(streakGroups.map((row) => [row.taskId, row._count._all]));

  const malformedConfig = [];
  const legacyTypeOnly = [];
  const configOnly = [];
  const disabledWithCachedRows = [];

  for (const task of tasks) {
    const configShape = getConfigShape(task.config);
    const enabled = isStreakEnabled(task.type, configShape);
    const cachedRows = streakCountByTaskId.get(task.id) || 0;

    if (configShape.malformed) {
      malformedConfig.push({
        ...task,
        rawValue: configShape.rawValue,
      });
    }

    if (task.type === "STREAK" && !configShape.streakEnabled) {
      legacyTypeOnly.push(task);
    }

    if (task.type !== "STREAK" && configShape.streakEnabled) {
      configOnly.push(task);
    }

    if (!enabled && cachedRows > 0) {
      disabledWithCachedRows.push({
        ...task,
        cachedRows,
      });
    }
  }

  const totalEnabled = tasks.filter((task) => {
    const configShape = getConfigShape(task.config);
    return isStreakEnabled(task.type, configShape);
  }).length;

  console.log("Streak configuration self-check");
  console.log(`- Total tasks: ${tasks.length}`);
  console.log(`- Streak-enabled tasks (effective rule): ${totalEnabled}`);
  console.log(`- Legacy type-only tasks: ${legacyTypeOnly.length}`);
  console.log(`- Config-only streak tasks: ${configOnly.length}`);
  console.log(`- Malformed streak config: ${malformedConfig.length}`);
  console.log(`- Disabled tasks with cached streak rows: ${disabledWithCachedRows.length}`);

  printTaskRows(
    "Malformed `config.streakEnabled` (must be boolean)",
    malformedConfig,
    (row) =>
      `#${row.id} ${row.key} (${row.type}, ${row.status}) raw=${JSON.stringify(row.rawValue)}`
  );
  printTaskRows("Legacy type-only streak tasks", legacyTypeOnly, (row) => `#${row.id} ${row.key}`);
  printTaskRows(
    "Non-STREAK tasks using config.streakEnabled=true",
    configOnly,
    (row) => `#${row.id} ${row.key} (${row.type})`
  );
  printTaskRows(
    "Disabled tasks that still have cached streak rows",
    disabledWithCachedRows,
    (row) => `#${row.id} ${row.key} cachedRows=${row.cachedRows}`
  );

  const hasWarnings =
    malformedConfig.length > 0 || disabledWithCachedRows.length > 0 || legacyTypeOnly.length > 0;
  if (strictMode && hasWarnings) {
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
