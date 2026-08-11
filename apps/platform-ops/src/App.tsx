import { Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "./components/Layout"
import { LoginPage } from "./pages/Login"
import { DashboardPage } from "./pages/Dashboard"
import { SellersPage, SellerDetailPage } from "./pages/Sellers"
import { BuyersPage, BuyerDetailPage } from "./pages/Buyers"
import { StoresPage, StoreDetailPage } from "./pages/Stores"
import { OrdersPage, OrderDetailPage } from "./pages/Orders"
import { ActivityPage } from "./pages/Activity"
import { getToken } from "./lib/api-client"

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="sellers" element={<SellersPage />} />
        <Route path="sellers/:id" element={<SellerDetailPage />} />
        <Route path="buyers" element={<BuyersPage />} />
        <Route path="buyers/:id" element={<BuyerDetailPage />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="stores/:id" element={<StoreDetailPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="activity" element={<ActivityPage />} />
      </Route>
    </Routes>
  )
}
