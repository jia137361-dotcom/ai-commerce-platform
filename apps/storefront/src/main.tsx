import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./styles/app.css"
import "./styles/store-home.css"
import "./styles/product-detail.css"
import "./styles/cart.css"
import "./styles/checkout.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
