import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const emptyForm = {
  name: "",
  description: "",
  price: "",
  stock: "",
};

export default function Products() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [message, setMessage] = useState("");
  const [pendingIds, setPendingIds] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setEmail(localStorage.getItem("email") || "");
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  async function fetchProducts() {
    setLoadingProducts(true);
    setLoadError("");
    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error("Failed to load products");
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoadingProducts(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    router.push("/login");
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setPending(id, value) {
    setPendingIds((prev) => ({ ...prev, [id]: value }));
  }

  async function handleAddProduct(event) {
    event.preventDefault();
    setCreateError("");

    if (!form.name.trim()) {
      setCreateError("Product name is required");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (Number.isNaN(price) || price < 0) {
      setCreateError("Price must be a valid non-negative number");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setCreateError("Stock must be a valid non-negative whole number");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          price,
          stock,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to add product");
      }

      const created = await response.json();
      setProducts((prev) => [...prev, created]);
      setForm(emptyForm);
      setMessage(`"${created.name}" was added to the catalog`);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleBuy(product) {
    setPending(product.id, true);
    setLoadError("");

    try {
      const response = await fetch(`/api/products/${product.id}/buy`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to complete purchase");
      }

      const updated = await response.json();
      setProducts((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setMessage(`Purchased "${updated.name}"`);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setPending(product.id, false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setPending(product.id, true);
    setLoadError("");

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to delete product");
      }

      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      setMessage(`"${product.name}" was deleted`);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setPending(product.id, false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">ACP Simple Store</h1>
            {email && (
              <p className="text-sm text-muted-foreground">
                Signed in as {email}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/">Dashboard</Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </header>

        {message && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Add a product</CardTitle>
            <CardDescription>
              Create a new item in the catalog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleAddProduct}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="price" className="text-sm font-medium">
                  Price
                </label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => updateForm("price", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="stock" className="text-sm font-medium">
                  Stock
                </label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => updateForm("stock", event.target.value)}
                  required
                />
              </div>

              {createError && (
                <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">
                  {createError}
                </p>
              )}

              <div className="sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={creating}>
                  {creating ? "Adding..." : "Add Product"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Catalog</h2>

          {loadError && <p className="text-sm text-red-600">{loadError}</p>}

          {loadingProducts ? (
            <p className="text-sm text-muted-foreground">
              Loading products...
            </p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products yet. Add one above to get started.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const isPending = Boolean(pendingIds[product.id]);
                const outOfStock = product.stock <= 0;

                return (
                  <Card key={product.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle>{product.name}</CardTitle>
                      {product.description && (
                        <CardDescription>
                          {product.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2">
                      <p className="text-lg font-semibold">
                        {currencyFormatter.format(product.price)}
                      </p>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          outOfStock
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {outOfStock ? "Out of stock" : `${product.stock} in stock`}
                      </span>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button
                        className="flex-1"
                        disabled={outOfStock || isPending}
                        onClick={() => handleBuy(product)}
                      >
                        {isPending ? "..." : "Buy"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleDelete(product)}
                      >
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
