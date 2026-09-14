import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const users = [
  { name: "Alice", email: "alice@example.com", role: "Admin" },
  { name: "Bob", email: "bob@example.com", role: "Member" },
  { name: "Charlie", email: "charlie@example.com", role: "Member" },
];

export default function Home() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setAuthenticated(true);
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    router.replace("/login");
  }

  if (!authenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="container py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="mt-2 text-muted-foreground">
              Static UI data for the starter application.
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild>
              <Link href="/products">Go to Products</Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {users.map((user) => (
            <Card key={user.email}>
              <CardHeader>
                <CardTitle className="text-lg">{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                  {user.role}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
