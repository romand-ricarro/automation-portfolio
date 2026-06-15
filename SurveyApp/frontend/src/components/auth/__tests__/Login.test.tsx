import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../../test/utils";
import { Login } from "../Login";
import { useAuth } from "../../../contexts/AuthContext";

vi.mock("../../../contexts/AuthContext");
const mockedUseAuth = vi.mocked(useAuth);

describe("Login Component", () => {
  const mockSignInWithGoogle = vi.fn();
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      authError: null,
      signInWithGoogle: mockSignInWithGoogle,
      signOut: mockSignOut,
      refreshUser: vi.fn(),
    });
  });

  it("renders login page with Google sign in button", () => {
    render(<Login />);

    expect(screen.getByText(/InsightPulse/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Sign in to access your dashboard/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with google/i })
    ).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      authError: null,
      signInWithGoogle: mockSignInWithGoogle,
      signOut: mockSignOut,
      refreshUser: vi.fn(),
    });

    render(<Login />);

    // LoadingSpinner should be visible, sign in button should not
    expect(
      screen.queryByRole("button", { name: /sign in with google/i })
    ).not.toBeInTheDocument();
  });

  it("calls signInWithGoogle when button is clicked", async () => {
    mockSignInWithGoogle.mockResolvedValue({});

    render(<Login />);

    const signInButton = screen.getByRole("button", {
      name: /sign in with google/i,
    });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  it("displays error message on login failure", async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error("Authentication failed"));

    render(<Login />);

    const signInButton = screen.getByRole("button", {
      name: /sign in with google/i,
    });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText(/Authentication failed/i)).toBeInTheDocument();
    });
  });

  it("displays generic error message when error has no message", async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error());

    render(<Login />);

    const signInButton = screen.getByRole("button", {
      name: /sign in with google/i,
    });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to sign in/i)).toBeInTheDocument();
    });
  });
});
