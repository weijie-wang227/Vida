import { ChevronDown } from "lucide-react";
import { navSections } from "../data/dashboard";
import { BrandLogo } from "./BrandLogo";

export type VendorTab = "dashboard" | "upcoming";

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
            <button type="button" className="nav-section__header">
              <span>{section.label}</span>
              <ChevronDown size={15} />
            </button>
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
