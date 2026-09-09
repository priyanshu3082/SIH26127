"use client";

import * as React from "react";
import { Search, Loader2 } from "lucide-react";
import { Input, Button } from "@sih/ui";
import { fetchKnownPlates } from "@/lib/api";
import { formatPlateDisplay } from "@/lib/plates";

export interface PlateSearchProps {
  onSearch: (plate: string) => void;
  loading?: boolean;
}

export function PlateSearch({ onSearch, loading }: PlateSearchProps) {
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      fetchKnownPlates(query.trim())
        .then((results) => setSuggestions(results.map((r) => r.plateText)))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  function submit(plate: string) {
    setQuery(plate);
    setOpen(false);
    onSearch(plate);
  }

  return (
    <div className="relative w-full max-w-md">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) submit(query.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value.toUpperCase());
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="WB 20 AB 1234"
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="primary" disabled={!query.trim() || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track"}
        </Button>
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-bg-4 shadow-lg">
          {suggestions.map((plate) => (
            <button
              key={plate}
              type="button"
              className="block w-full px-3 py-2 text-left font-mono text-sm text-text-secondary hover:bg-bg-3 hover:text-text-primary"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => submit(plate)}
            >
              {formatPlateDisplay(plate)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
