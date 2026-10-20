import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Landing from "./LandingPage/Landing";
import Login from "./LoginSignup/LoginSignUp";
import ForgotPassword from "./Password/ForgotPassword";
import ResetPassword from "./Password/ResetPassword";
import ChangePassword from "./Password/ChangePassword";

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/signup" element={<p>signup page</p>} />
        <Route path="/dashboard" element={<p>dashboard page</p>} />
      </Routes>
    </MemoryRouter>
  );

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

describe("Landing", () => {
  test("introduces the product and links to the real login route", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1, name: /know where every journey stands/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("navigation", { name: "Main" }).querySelector('a[href="/login"]'));
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  test("in-page links point at sections that exist, and no stats or testimonials are claimed", () => {
    const { container } = renderAt("/");
    const anchors = [...container.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href").slice(1));
    anchors.forEach((id) => expect(container.querySelector(`#${id}`)).not.toBeNull());
    expect(container.textContent).not.toMatch(/\d+%|trusted by/i);
  });

  test("mobile menu toggles and closes with Escape", () => {
    renderAt("/");
    const btn = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Login", () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pw" } });
  };

  test("password visibility toggle", () => {
    renderAt("/login");
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
  });

  test("shows the server error inline and stores no token", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, json: async () => ({ error: "Invalid credentials" }) });
    renderAt("/login");
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
    expect(localStorage.getItem("token")).toBeNull();
  });

  test("sends the same request once, stores the token and goes to /dashboard", async () => {
    let resolve;
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(
      () => new Promise((r) => { resolve = r; })
    );
    renderAt("/login");
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    const busy = screen.getByRole("button", { name: /signing in/i });
    expect(busy).toBeDisabled();
    fireEvent.submit(busy.closest("form"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/login$/);
    expect(opts).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(opts.body)).toEqual({ email: "a@example.com", password: "pw" });
    resolve({ ok: true, json: async () => ({ token: "t" }) });
    await waitFor(() => expect(screen.getByText("dashboard page")).toBeInTheDocument());
    expect(localStorage.getItem("token")).toBe("t");
  });
});

// Unsigned test tokens: only the payload matters to jwtDecode.
const fakeJwt = (payload) => `x.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.y`;

describe("Password recovery", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  test("login links to forgot password, carrying the typed email", () => {
    renderAt("/login");
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("link", { name: "Forgot password?" }));
    expect(screen.getByLabelText("Email address")).toHaveValue("a@example.com");
  });

  test("forgot password shows the server's neutral message", async () => {
    const message = "If an account exists for a@example.com, an administrator has been asked to reset its password.";
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ delivery: "admin", message }) });
    renderAt("/forgot-password");
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Request sent" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/forgot_password$/);
  });

  test("reset page without a token explains the link is incomplete", () => {
    renderAt("/reset-password");
    expect(screen.getByRole("heading", { name: "Link incomplete" })).toBeInTheDocument();
  });

  test("reset page validates locally, then sends the token from the URL fragment", async () => {
    window.history.replaceState(null, "", "/reset-password#token=abc123abc123abc123abc123");
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ message: "ok" }) });
    renderAt("/reset-password");
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "longenough1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(screen.getByText("The passwords don't match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "longenough1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByRole("heading", { name: "Password changed" })).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: "abc123abc123abc123abc123", password: "longenough1" });
    expect(window.location.hash).toBe("");
  });

  test("login with a temporary password goes to the change-password page", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ token: fakeJwt({ must_change_password: true }), must_change_password: true }) });
    renderAt("/login");
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Temp12345678" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
    expect(screen.getByLabelText("Temporary password")).toBeInTheDocument();
  });

  test("change password stores the fresh token and continues to the dashboard", async () => {
    localStorage.setItem("token", fakeJwt({ must_change_password: true }));
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ token: "fresh" }) });
    renderAt("/change-password");
    fireEvent.change(screen.getByLabelText("Temporary password"), { target: { value: "Temp12345678" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Mine-12345" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Mine-12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
    await waitFor(() => expect(screen.getByText("dashboard page")).toBeInTheDocument());
    expect(localStorage.getItem("token")).toBe("fresh");
  });
});
