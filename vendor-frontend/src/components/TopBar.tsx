import {
  BookOpen,
  ChevronDown,
  Grid3X3,
  LogOut,
  MessageCircle,
  Search,
} from "lucide-react";

export function TopBar({
  accountName,
  onSignOut,
}: {
  accountName: string;
  onSignOut: () => void;
}) {
  return (
    <header className="topbar">
      <label className="topbar__search">
        <Search size={17} />
        <input placeholder="Search orders, products, promotions" />
      </label>

      <div className="topbar__actions">
        <button type="button" className="icon-button" aria-label="Apps">
          <Grid3X3 size={19} />
        </button>
        <button type="button" className="icon-button" aria-label="Guidebook">
          <BookOpen size={19} />
        </button>
        <button type="button" className="icon-button" aria-label="Messages">
          <MessageCircle size={19} />
        </button>
        <button type="button" className="account-button">
          <span className="account-button__avatar">
            {accountName.slice(0, 1).toUpperCase() || "V"}
          </span>
          <span>{accountName}</span>
          <ChevronDown size={16} />
        </button>
        <button type="button" className="icon-button" onClick={onSignOut} aria-label="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
