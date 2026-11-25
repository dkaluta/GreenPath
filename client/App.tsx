import { DirectionProvider } from "@base-ui/react/direction-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { Spinner, ToastProvider, TooltipProvider } from "./components";
import { AuthProvider, RequireAuth } from "./lib/auth";
import { DIRECTION, SHOW_DEMOS } from "./lib/config";
import { RequireMobile } from "./lib/RequireMobile";
import { Layout, MapLayout } from "./pages/Layout";

// One line per page. Each page is downloaded the first time someone visits
// it, so adding pages never slows down the rest of the app.
const HomePage = lazy(() => import("./pages/home/HomePage"));
// The GreenPath screens, in the order of the flow. See docs/00-product.markdown.
const WalkSetupPage = lazy(() => import("./pages/walk/WalkSetupPage"));
const RouteChoicePage = lazy(() => import("./pages/route/RouteChoicePage"));
const NavigatePage = lazy(() => import("./pages/navigate/NavigatePage"));
const ReportPage = lazy(() => import("./pages/navigate/ReportPage"));
const StopPage = lazy(() => import("./pages/navigate/StopPage"));
const CapturePage = lazy(() => import("./pages/navigate/CapturePage"));
const MatchPage = lazy(() => import("./pages/navigate/MatchPage"));
const SummaryPage = lazy(() => import("./pages/summary/SummaryPage"));
const CollectionPage = lazy(() => import("./pages/collection/CollectionPage"));
const SignInPage = lazy(() => import("./pages/signin/SignInPage"));
const AuthCallbackPage = lazy(() => import("./pages/auth/AuthCallbackPage"));
const EventsPage = lazy(() => import("./pages/events/EventsPage"));
const EventNewPage = lazy(() => import("./pages/events/EventNewPage"));
const EventDetailPage = lazy(() => import("./pages/events/EventDetailPage"));
const EventEditPage = lazy(() => import("./pages/events/EventEditPage"));
const DesignPage = lazy(() => import("./pages/design/DesignPage"));
const ComponentsPage = lazy(() => import("./pages/components/ComponentsPage"));
const DemosPage = lazy(() => import("./pages/demos/DemosPage"));
const BlankDemoPage = lazy(() => import("./pages/demos/BlankDemoPage"));
const ElementsDemoPage = lazy(() => import("./pages/demos/ElementsDemoPage"));
const VizDemoPage = lazy(() => import("./pages/demos/VizDemoPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Holds the data fetched from the server, so two pages asking for the same
// thing only cause one request. See client/features/events/ for how it's used.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch everything the moment the user clicks back into the tab.
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * The top of the browser app.
 *
 * The providers wrap everything, then the router picks a page based on the URL.
 * To add a page: make a file in client/pages/<section>/ that does
 * `export default function MyPage()`, add a lazy() line at the top of this
 * file, then a <Route> below. Put it inside <RequireAuth> if you have to be
 * logged in to see it.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DirectionProvider direction={DIRECTION}>
        <TooltipProvider>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                {/* Shows a spinner while a page downloads. Pages inside
                <Layout> or <MapLayout> get their own. */}
                <Suspense
                  fallback={
                    <main>
                      <Spinner />
                    </main>
                  }
                >
                  <Routes>
                    <Route
                      path="/auth/callback"
                      element={<AuthCallbackPage />}
                    />

                    {/* The GreenPath screens: the map fills the screen, and
                    each screen is a panel (desktop) or sheet (phone) over
                    it. See client/features/map/MapScreen.tsx. */}
                    <Route element={<MapLayout />}>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/signin" element={<SignInPage />} />
                      <Route path="/walk" element={<WalkSetupPage />} />
                      <Route path="/route" element={<RouteChoicePage />} />
                      <Route path="/summary" element={<SummaryPage />} />

                      {/* Turn-by-turn: phones only. See client/lib/device.ts. */}
                      <Route element={<RequireMobile />}>
                        <Route path="/navigate" element={<NavigatePage />} />
                        <Route
                          path="/navigate/report"
                          element={<ReportPage />}
                        />
                        <Route path="/navigate/stop" element={<StopPage />} />
                        <Route
                          path="/navigate/capture"
                          element={<CapturePage />}
                        />
                        <Route path="/navigate/match" element={<MatchPage />} />
                      </Route>

                      <Route element={<RequireAuth />}>
                        <Route
                          path="/collection"
                          element={<CollectionPage />}
                        />
                      </Route>

                      <Route path="*" element={<NotFoundPage />} />
                    </Route>

                    {/* The starter kit's own pages get the header and footer
                    from client/pages/Layout.tsx. */}
                    <Route element={<Layout />}>
                      <Route path="/design" element={<DesignPage />} />

                      {/* Everything in here needs a login. */}
                      <Route element={<RequireAuth />}>
                        <Route path="/events" element={<EventsPage />} />
                        <Route path="/events/new" element={<EventNewPage />} />
                        <Route
                          path="/events/:id"
                          element={<EventDetailPage />}
                        />
                        <Route
                          path="/events/:id/edit"
                          element={<EventEditPage />}
                        />
                      </Route>

                      {/* The component gallery and the demos. Set
                      VITE_SHOW_DEMOS=false in .env to hide them before
                      handing the app over. */}
                      {SHOW_DEMOS ? (
                        <>
                          <Route
                            path="/components"
                            element={<ComponentsPage />}
                          />
                          <Route path="/demos" element={<DemosPage />} />
                          <Route
                            path="/demos/blank"
                            element={<BlankDemoPage />}
                          />
                          <Route
                            path="/demos/elements"
                            element={<ElementsDemoPage />}
                          />
                          <Route path="/demos/viz" element={<VizDemoPage />} />
                        </>
                      ) : null}
                    </Route>
                  </Routes>
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </TooltipProvider>
      </DirectionProvider>
    </QueryClientProvider>
  );
}
