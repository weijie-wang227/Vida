import { navSections } from "../data/dashboard";
import { BrandLogo } from "../components/BrandLogo";

export type VendorTab =
  | "dashboard"
  | "upcoming"
  | "create-activity"
  | "create-session"
  | "volunteer-management"
  | "finances"
  | "users"
  | "chats";

export function Sidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: VendorTab;
  onTabChange: (tab: VendorTab) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <BrandLogo />
      </div>

      <nav className="sidebar__nav" aria-label="Vendor navigation">
        {navSections.map((section) => (
          <section key={section.label} className="nav-section">
            <div className="nav-section__header">
              <span>{section.label}</span>
            </div>
            <div className="nav-section__items">
              {section.items.map(({ id, label, active, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className={`nav-item${
                    (id ? activeTab === id : active) ? " nav-item--active" : ""
                  }`}
                  onClick={() => id && onTabChange(id)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
