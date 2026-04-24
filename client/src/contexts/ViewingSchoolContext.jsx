import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "dojo:viewingSchoolId";

const ViewingSchoolContext = createContext({
  viewingSchoolId: null,
  setViewingSchoolId: () => {},
});

function readStored() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ViewingSchoolProvider({ children }) {
  const queryClient = useQueryClient();
  const [viewingSchoolId, setViewingSchoolIdState] = useState(readStored);

  const setViewingSchoolId = useCallback(
    (next) => {
      setViewingSchoolIdState(next);
      if (typeof window !== "undefined") {
        if (next == null) window.localStorage.removeItem(STORAGE_KEY);
        else window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      // Any school-scoped data is now stale — blow the cache so queries refetch
      // with the new X-Viewing-School-Id header.
      queryClient.invalidateQueries();
    },
    [queryClient]
  );

  // Sync across tabs
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      if (e.key !== STORAGE_KEY) return;
      setViewingSchoolIdState(readStored());
      queryClient.invalidateQueries();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [queryClient]);

  return (
    <ViewingSchoolContext.Provider value={{ viewingSchoolId, setViewingSchoolId }}>
      {children}
    </ViewingSchoolContext.Provider>
  );
}

export function useViewingSchool() {
  return useContext(ViewingSchoolContext);
}
