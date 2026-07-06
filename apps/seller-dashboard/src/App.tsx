import { useEffect, useState } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "./components/Layout"
import { LoginPage } from "./pages/Login"
import { RegisterPage } from "./pages/Register"
import { ProductListPage } from "./pages/Products/ProductList"
import { EditDraftPage } from "./pages/Products/EditDraft"
import { OrderListPage } from "./pages/Orders/OrderList"
import { OrderFulfillmentPage } from "./pages/Orders/OrderFulfillment"
import { SettingsPage } from "./pages/Settings"
import { CreateProductPage } from "./pages/AiStudio/CreateProduct"
import { GenerationProgressPage } from "./pages/AiStudio/GenerationProgress"
import { GenerationCompletePage } from "./pages/AiStudio/GenerationComplete"
import { ProductReviewsPage, StoreMessagesPage as SellerStoreMessagesPage } from "./pages/Reviews/ProductReviews"
import { fetchSellerSession, setToken } from "./lib/api-client"
import { clearSellerStoreId } from "./lib/seller-store-id"

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "valid" | "invalid">(
    localStorage.getItem("seller_admin_token") ? "checking" : "invalid"
  )

  useEffect(() => {
    if (!localStorage.getItem("seller_admin_token")) {
      setStatus("invalid")
      return
    }

    let active = true
    fetchSellerSession()
      .then(() => {
        if (active) setStatus("valid")
      })
      .catch(() => {
        setToken(null)
        clearSellerStoreId()
        if (active) setStatus("invalid")
      })

    return () => {
      active = false
    }
  }, [])

  if (status === "checking") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking seller session…</div>
  }
  if (status === "invalid") return <Navigate to="/login" replace />
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
        <Route index element={<Navigate to="/products" replace />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/:id/edit" element={<EditDraftPage />} />
        <Route path="orders" element={<OrderListPage />} />
        <Route path="orders/:orderId/fulfillment" element={<OrderFulfillmentPage />} />
        <Route path="reviews" element={<ProductReviewsPage />} />
        <Route path="messages" element={<SellerStoreMessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="ai-studio/create" element={<CreateProductPage />} />
        <Route path="ai-studio/progress/:jobId" element={<GenerationProgressPage />} />
        <Route path="ai-studio/complete/:productId" element={<GenerationCompletePage />} />
      </Route>
    </Routes>
  )
}
