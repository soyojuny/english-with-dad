import { useEffect, useState } from "react";
import type { Dvd } from "../lib/reading-types";
import { fetchDvdCatalogData } from "../lib/supabase/reading-store";

type Options = {
  supabase: Parameters<typeof fetchDvdCatalogData>[0];
  ownerUserId: string;
  childId: string;
};

type Catalog = { status: "loading" | "error" | "ready"; dvds: Dvd[] };
type RequestState = Options & { catalog: Catalog };

export function useChildDvdCatalog({ supabase, ownerUserId, childId }: Options): Catalog {
  const [state, setState] = useState<RequestState | null>(null);

  useEffect(() => {
    let current = true;
    setState({ supabase, ownerUserId, childId, catalog: { status: "loading", dvds: [] } });

    fetchDvdCatalogData(supabase, ownerUserId).then(
      ({ dvds }) => {
        if (current) setState({ supabase, ownerUserId, childId, catalog: { status: "ready", dvds: dvds.filter((dvd) => dvd.active) } });
      },
      () => {
        if (current) setState({ supabase, ownerUserId, childId, catalog: { status: "error", dvds: [] } });
      },
    );

    return () => { current = false; };
  }, [supabase, ownerUserId, childId]);

  if (!state || state.supabase !== supabase || state.ownerUserId !== ownerUserId || state.childId !== childId) {
    return { status: "loading", dvds: [] };
  }
  return state.catalog;
}
