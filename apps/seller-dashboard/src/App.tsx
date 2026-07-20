import { Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "./components/Layout"
import { LoginPage } from "./pages/Login"
import { RegisterPage } from "./pages/Register"
import { OverviewPage } from "./pages/Overview"
import { EditDraftPage } from "./pages/Products/EditDraft"
import { ProductListPage } from "./pages/Products/ProductList"
import { OrderListPage } from "./pages/Orders/OrderList"
import { OrderFulfillmentPage } from "./pages/Orders/OrderFulfillment"
import { SettingsPage } from "./pages/Settings"
import { ProductReviewsPage, StoreMessagesPage as SellerStoreMessagesPage } from "./pages/Reviews/ProductReviews"
import { ErrorBoundary } from "./components/ErrorBoundary"

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("seller_admin_token")
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="orders" element={<OrderListPage />} />
        <Route path="orders/:orderId/fulfillment" element={<OrderFulfillmentPage />} />
        <Route path="reviews" element={<ProductReviewsPage />} />
        <Route path="messages" element={<SellerStoreMessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route
          path="products/:id/edit"
          element={
            <ErrorBoundary>
              <EditDraftPage />
            </ErrorBoundary>
          }
        />
        <Route path="categories" element={<Navigate to="/" replace />} />
        <Route path="suppliers" element={<Navigate to="/" replace />} />
        <Route path="suppliers/:supplierId/catalog" element={<Navigate to="/" replace />} />
        <Route path="supplier-catalog" element={<Navigate to="/" replace />} />
        <Route path="ai-studio/*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
