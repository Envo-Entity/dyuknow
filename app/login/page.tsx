import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in · Dyuknow" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : null} devLogin={process.env.NEXT_PUBLIC_DEV_LOGIN === "true"} />;
}
