import { useNavigate, useLocation } from "react-router-dom";
import { WalletDropdown } from "./WalletDropdown";

export function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="game-menu sticky top-0 z-40">
      <div className="w-full flex justify-between items-center">
        <div
          className={`menu-item ${isActive("/") ? "active" : ""}`}
          onClick={() => navigate("/")}
        >
          Home
        </div>

        <div className="flex">
          <div
            className={`menu-item ${isActive("/options") ? "active" : ""}`}
            onClick={() => navigate("/options")}
          >
            Options
          </div>
          <div
            className={`menu-item ${isActive("/swap") ? "active" : ""}`}
            onClick={() => navigate("/swap")}
          >
            Swap
          </div>
          <div
            className={`menu-item ${isActive("/futures") ? "active" : ""}`}
            onClick={() => navigate("/futures")}
          >
            Futures
          </div>
        </div>

        <div className="flex items-center">
          <WalletDropdown />
        </div>
      </div>
    </nav>
  );
}
