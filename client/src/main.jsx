import { UNAUTHED_ERR_MSG } from '@/lib/constants';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ViewingSchoolProvider } from "@/contexts/ViewingSchoolContext";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error) => {
  if (typeof window === "undefined") return;
  const err = error;
  if (err?.status === 401 || err?.message === UNAUTHED_ERR_MSG) {
    // Supabase Auth handles login — redirect to login page
    window.location.href = "/login";
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <ViewingSchoolProvider>
      <App />
    </ViewingSchoolProvider>
  </QueryClientProvider>
);
