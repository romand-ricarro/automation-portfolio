import React from "react";
import { NavLink } from "react-router-dom";
import { Home, List, CheckSquare, X, BarChart3, Users } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  className,
}) => {
  const { user } = useAuth();

  const links = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/sessions", label: "Sessions", icon: List },
    { to: "/action-items", label: "Action Items", icon: CheckSquare },
    { to: "/reports", label: "Reports", icon: BarChart3 },
  ];

  if (user?.role === "admin") {
    links.push({ to: "/users", label: "User Management", icon: Users });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container - Glassmorphism */}
      <aside
        className={clsx(
          "fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 backdrop-blur-md bg-white/80 dark:bg-slate-950/50 border-r border-gray-200 dark:border-white/5 z-40 transition-transform duration-300 lg:translate-x-0 overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="p-4">
          <div className="flex justify-between items-center lg:hidden mb-4">
            <span className="font-semibold text-gray-500 dark:text-gray-400">Navigation</span>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <nav className="space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center px-4 py-2.5 text-sm font-medium rounded-bento transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-primary/10 to-accent/10 text-primary dark:text-primary-light border-l-2 border-primary"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:translate-x-1"
                  )
                }
              >
                <link.icon className="w-5 h-5 mr-3" />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};
