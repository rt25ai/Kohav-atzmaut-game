import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  ADMIN_ROUTE_SEGMENT,
} from "@/lib/config";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "kochav-admin-2026";
const ADMIN_COOKIE_SECRET =
  process.env.ADMIN_COOKIE_SECRET || "dev-cookie-secret-change-me";

function sign(value: string) {
  return crypto.createHmac("sha256", ADMIN_COOKIE_SECRET).update(value).digest("hex");
}

function createSignedValue() {
  const payload = `admin:${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

function verifySignedValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expected = sign(payload);
  return crypto.timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}

export function getAdminPassword() {
  return ADMIN_PASSWORD;
}

export function getAdminRoute() {
  return `/${ADMIN_ROUTE_SEGMENT}`;
}

export async function isAdminAuthorized() {
  const store = await cookies();
  return verifySignedValue(store.get(ADMIN_COOKIE_NAME)?.value);
}

export async function setAdminCookie() {
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, createSignedValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
