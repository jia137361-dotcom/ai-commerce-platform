const groups = [
  {
    title: "Shopping and General",
    items: ["Orders", "Processing", "Shipped", "Delivered", "Returns", "Cart", "Reviews"],
  },
  {
    title: "Settings",
    items: ["Profile", "Addresses", "Language", "Country/Region & Currency"],
  },
  {
    title: "Customer Service",
    items: ["Help center", "Terms and policies", "Report to us", "About Us", "Contact Us"],
  },
  {
    title: "Login",
    items: ["Log out"],
  },
]

export function AccountSidebar() {
  return (
    <aside className="account-sidebar">
      <div className="account-profile">
        <div className="avatar">lu</div>
        <div>
          <strong>lulu</strong>
          <span>CiiVerse member</span>
        </div>
      </div>
      {groups.map((group) => (
        <section key={group.title} className="sidebar-group">
          <h3>{group.title}</h3>
          {group.items.map((item) => (
            <a className={item === "Orders" ? "active" : ""} href="/account/orders" key={item}>
              {item}
            </a>
          ))}
        </section>
      ))}
    </aside>
  )
}
