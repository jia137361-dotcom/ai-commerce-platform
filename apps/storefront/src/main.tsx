import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { BuyerAuthProvider } from "./auth/BuyerAuthProvider"
import { BuyerLocaleProvider } from "./lib/locale"
import "./styles/app.css"
import "./styles/store-home.css"
import "./styles/product-detail.css"
import "./styles/cart.css"
import "./styles/checkout.css"
import "./styles/orders.css"
import "./styles/account.css"
import "./styles/design-system.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BuyerLocaleProvider>
      <BuyerAuthProvider>
        <App />
      </BuyerAuthProvider>
    </BuyerLocaleProvider>
  </React.StrictMode>
)
