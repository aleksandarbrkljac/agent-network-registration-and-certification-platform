import type { User, UserRole } from "@agent-network/shared";
import { userRoleSchema } from "@agent-network/shared";
import { prisma } from "../client.js";
import { toUser } from "../mappers.js";

export async function list(): Promise<User[]> {
  const rows = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return rows.map(toUser);
}

export async function getByRole(role: UserRole): Promise<User[]> {
  const rows = await prisma.user.findMany({
    where: { role: userRoleSchema.parse(role) },
    orderBy: { name: "asc" },
  });
  return rows.map(toUser);
}

export async function getById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? toUser(row) : null;
}
