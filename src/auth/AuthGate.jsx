import { createContext, useContext, useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { apiRequest } from "./api.js";

export const AuthContext = createContext(null);

export const useAuth = () => {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthGate.");
  return auth;
};

export default function AuthGate({ children }) {
  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    mode: "login",
    bootstrapConfigured: false,
    invitation: null,
    resetInfo: null,
    inviteToken: "",
    resetToken: "",
    error: "",
    notice: "",
  });

  useEffect(() => {
    let mounted = true;

    const loadAuthState = async () => {
      try {
        const status = await apiRequest("/api/auth/status");
        let session = null;
        try {
          session = await apiRequest("/api/auth/session");
        } catch (error) {
          if (error.status !== 401) throw error;
        }

        const query = new URLSearchParams(window.location.search);
        const inviteToken = query.get("invite") || "";
        const resetToken = query.get("reset") || "";
        let invitation = null;
        let resetInfo = null;
        if (!session?.user && inviteToken) {
          invitation = await apiRequest(
            `/api/invitations/${encodeURIComponent(inviteToken)}`,
          );
        } else if (!session?.user && resetToken) {
          resetInfo = await apiRequest(
            `/api/password-resets/${encodeURIComponent(resetToken)}`,
          );
        }

        if (!mounted) return;
        setAuthState({
          loading: false,
          user: session?.user || null,
          mode: session?.user
            ? "login"
            : invitation
              ? "invite"
              : resetInfo
                ? "reset"
                : "login",
          bootstrapConfigured: status.bootstrapConfigured,
          invitation,
          resetInfo,
          inviteToken,
          resetToken,
          error: "",
          notice: "",
        });
      } catch (error) {
        if (!mounted) return;
        setAuthState((current) => ({
          ...current,
          loading: false,
          mode: "unavailable",
          error: error.message,
        }));
      }
    };

    loadAuthState();
    return () => {
      mounted = false;
    };
  }, []);

  const acceptLogin = (user) => {
    window.history.replaceState({}, "", window.location.pathname);
    setAuthState((current) => ({ ...current, user, error: "" }));
  };

  const logout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      setAuthState((current) => ({ ...current, user: null, mode: "login" }));
    }
  };

  const completePasswordReset = () => {
    window.history.replaceState({}, "", window.location.pathname);
    setAuthState((current) => ({
      ...current,
      mode: "login",
      resetToken: "",
      resetInfo: null,
      notice: "Password updated. Sign in with your new password.",
    }));
  };

  if (authState.loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-600">
        Checking your session…
      </div>
    );
  }

  if (!authState.user) {
    return (
      <AuthenticationScreen
        key={`${authState.mode}:${authState.notice}`}
        state={authState}
        onAuthenticated={acceptLogin}
        onPasswordReset={completePasswordReset}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <AuthContext.Provider value={{ user: authState.user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function AuthenticationScreen({
  state,
  onAuthenticated,
  onPasswordReset,
  onRetry,
}) {
  const [screen, setScreen] = useState(state.mode);
  const [invitation, setInvitation] = useState(state.invitation);
  const [inviteToken, setInviteToken] = useState(state.inviteToken);
  const [resetInfo] = useState(state.resetInfo);
  const [inviteCode, setInviteCode] = useState("");
  const [signupMode, setSignupMode] = useState("shop");
  const [form, setForm] = useState({
    name: "",
    shopName: "",
    email: state.invitation?.email || state.resetInfo?.email || "",
    phone: "",
    password: "",
    bootstrapToken: "",
    otp: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(state.error);
  const [notice, setNotice] = useState(state.notice);
  const [submitting, setSubmitting] = useState(false);
  const [otpState, setOtpState] = useState({
    loading: false,
    sent: false,
    verified: false,
    message: "",
  });

  const isSetup = screen === "bootstrap";
  const isInvite = screen === "invite";
  const isReset = screen === "reset";
  const isLogin = screen === "login";
  const isSignup = screen === "signup";
  const isForgot = screen === "forgot";
  const isShopSignup = isSignup && signupMode === "shop";
  const otpPurpose = isSetup
    ? "bootstrap"
    : isInvite
      ? "invite"
      : isShopSignup
        ? "shop-signup"
        : "reset";
  const emailForOtp = (
    isSetup || isInvite || isShopSignup
      ? form.email
      : resetInfo?.email || form.email
  ).trim();

  const handleSendOtp = async () => {
    const email = emailForOtp;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email to receive the verification code.");
      return;
    }

    setOtpState({ loading: true, sent: false, verified: false, message: "" });
    setForm((current) => ({ ...current, otp: "" }));
    setError("");
    try {
      const result = await apiRequest("/api/auth/send-otp", {
        method: "POST",
        body: { email, purpose: otpPurpose },
      });
      if (result.otp) {
        setForm((current) => ({ ...current, otp: result.otp }));
      }
      setOtpState({
        loading: false,
        sent: true,
        verified: false,
        message: result.otp
          ? `${result.message} Development code: ${result.otp}`
          : result.message || `Verification code sent to ${email}.`,
      });
      setNotice("");
    } catch (requestError) {
      setError(requestError.message);
      setOtpState({
        loading: false,
        sent: false,
        verified: false,
        message: "",
      });
    }
  };

  const handleSignupInvitation = async () => {
    let token = inviteCode.trim();
    try {
      if (token.includes("/")) {
        token = new URL(token).searchParams.get("invite") || token;
      }
    } catch {
      setError("Enter a valid invitation link or code.");
      return;
    }
    if (!token || token.length > 256) {
      setError("Enter a valid invitation link or code.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const details = await apiRequest(
        `/api/invitations/${encodeURIComponent(token)}`,
      );
      setInvitation(details);
      setInviteToken(token);
      setForm((current) => ({ ...current, email: details.email, otp: "" }));
      setOtpState({
        loading: false,
        sent: false,
        verified: false,
        message: "",
      });
      setScreen("invite");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const email = emailForOtp;
    if (!email || !/^\d{6}$/.test(String(form.otp || ""))) {
      setError("Enter the 6-digit verification code before continuing.");
      return;
    }

    setOtpState((current) => ({ ...current, loading: true }));
    setError("");
    try {
      await apiRequest("/api/auth/verify-otp", {
        method: "POST",
        body: { email, otp: form.otp, purpose: otpPurpose },
      });
      setOtpState({
        loading: false,
        sent: true,
        verified: true,
        message: "Email verified successfully.",
      });
      setNotice("");
    } catch (requestError) {
      setError(requestError.message);
      setOtpState((current) => ({ ...current, loading: false }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (
        (isSetup || isInvite || isShopSignup || isForgot) &&
        !otpState.verified
      ) {
        setError("Verify your email with the OTP before continuing.");
        return;
      }
      if (
        (isForgot || isShopSignup) &&
        form.password !== form.confirmPassword
      ) {
        setError("The passwords do not match.");
        return;
      }

      let result;
      if (isSetup) {
        result = await apiRequest("/api/auth/bootstrap", {
          method: "POST",
          body: { ...form, otp: form.otp, purpose: otpPurpose },
        });
      } else if (isInvite) {
        result = await apiRequest("/api/invitations/accept", {
          method: "POST",
          body: { ...form, otp: form.otp, token: inviteToken },
        });
      } else if (isShopSignup) {
        result = await apiRequest("/api/auth/signup", {
          method: "POST",
          body: {
            name: form.name,
            shopName: form.shopName,
            email: form.email,
            password: form.password,
            otp: form.otp,
          },
        });
      } else if (isForgot) {
        await apiRequest("/api/password-resets/otp", {
          method: "POST",
          body: {
            email: form.email,
            otp: form.otp,
            password: form.password,
          },
        });
        onPasswordReset();
        return;
      } else if (isReset) {
        await apiRequest("/api/password-resets/accept", {
          method: "POST",
          body: { token: state.resetToken, password: form.password },
        });
        onPasswordReset();
        return;
      } else {
        result = await apiRequest("/api/auth/login", {
          method: "POST",
          body: { email: form.email, password: form.password },
        });
      }
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const heading = isSetup
    ? "Set up your shop"
    : isInvite
      ? "Accept your team invitation"
      : isSignup
        ? signupMode === "shop"
          ? "Create your shop"
          : "Join a shop"
        : isForgot
          ? "Recover your password"
          : isReset
            ? "Set a new password"
            : isLogin
              ? "Sign in to Apna Dhandha"
              : "Authentication service unavailable";

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_30%),linear-gradient(135deg,#f8fafc_0%,#eff6ff_35%,#fff7ed_100%)] px-4 py-10">
      <section className="w-full max-w-lg rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-blue-600 via-indigo-600 to-teal-500 text-white shadow-lg shadow-indigo-500/30">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Apna Dhandha
            </p>
            <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
          </div>
        </div>

        {screen === "unavailable" ? (
          <div className="space-y-4">
            <p role="alert" className="text-sm text-red-700">
              {state.error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="w-full rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95"
            >
              Retry
            </button>
          </div>
        ) : isSignup ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600">
              Create a new shop or join an existing shop with an invitation.
            </p>
            <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setSignupMode("shop");
                  setError("");
                  setOtpState({
                    loading: false,
                    sent: false,
                    verified: false,
                    message: "",
                  });
                }}
                aria-pressed={signupMode === "shop"}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${signupMode === "shop" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
              >
                Create a shop
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignupMode("invite");
                  setError("");
                }}
                aria-pressed={signupMode === "invite"}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${signupMode === "invite" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
              >
                Join a shop
              </button>
            </div>
            {signupMode === "invite" ? (
              <>
                <label className="block space-y-1 text-sm">
                  <span>Invitation link or code</span>
                  <input
                    type="text"
                    autoComplete="off"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="Paste invitation link or code"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSignupInvitation}
                  disabled={submitting}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
                >
                  {submitting
                    ? "Checking invitation…"
                    : "Continue with invitation"}
                </button>
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block space-y-1 text-sm">
                  <span>Shop / business name</span>
                  <input
                    autoComplete="organization"
                    maxLength={120}
                    required
                    value={form.shopName}
                    onChange={(event) =>
                      setForm({ ...form, shopName: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Owner name</span>
                  <input
                    autoComplete="name"
                    maxLength={120}
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Email</span>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={(event) => {
                        setForm({
                          ...form,
                          email: event.target.value,
                          otp: "",
                        });
                        setOtpState({
                          loading: false,
                          sent: false,
                          verified: false,
                          message: "",
                        });
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpState.loading}
                      className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {otpState.loading ? "Sending…" : "Send OTP"}
                    </button>
                  </div>
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Email verification OTP</span>
                  <div className="flex gap-2">
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={form.otp}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          otp: event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6),
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpState.loading || !form.otp}
                      className="rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {otpState.verified ? "Verified" : "Verify"}
                    </button>
                  </div>
                  {otpState.message && (
                    <span className="block text-xs text-slate-500">
                      {otpState.message}
                    </span>
                  )}
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm({ ...form, confirmPassword: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900"
                  />
                </label>
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Creating shop…" : "Create shop"}
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setScreen("login");
                setError("");
              }}
              className="w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Back to sign in
            </button>
          </div>
        ) : isSetup && !state.bootstrapConfigured ? (
          <p
            role="alert"
            className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
          >
            Configure SESSION_SECRET and BOOTSTRAP_ADMIN_TOKEN in the server
            environment before creating the first shop administrator.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {(isInvite || isReset) && (
              <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-slate-700">
                {isInvite ? (
                  <>
                    Invited as <strong>{invitation.role}</strong> for{" "}
                    <strong>{invitation.email}</strong>
                  </>
                ) : (
                  <>
                    Reset password for <strong>{resetInfo.email}</strong>
                  </>
                )}
              </div>
            )}

            {isSetup && (
              <label className="block space-y-1 text-sm">
                <span>Shop / business name</span>
                <input
                  autoComplete="organization"
                  required
                  maxLength={120}
                  value={form.shopName}
                  onChange={(event) =>
                    setForm({ ...form, shopName: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 transition focus:border-indigo-400 focus:bg-white"
                />
              </label>
            )}

            {(isSetup || isInvite) && (
              <label className="block space-y-1 text-sm">
                <span>{isSetup ? "Owner / admin name" : "Full name"}</span>
                <input
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 transition focus:border-indigo-400 focus:bg-white"
                />
              </label>
            )}

            {isSetup && (
              <label className="block space-y-1 text-sm">
                <span>Initial setup token</span>
                <input
                  type="password"
                  autoComplete="off"
                  required
                  value={form.bootstrapToken}
                  onChange={(event) =>
                    setForm({ ...form, bootstrapToken: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 transition focus:border-indigo-400 focus:bg-white"
                />
              </label>
            )}

            {(isLogin || isSetup || isInvite || isForgot) && (
              <label className="block space-y-1 text-sm">
                <span>Email</span>
                <div className="flex gap-2">
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(event) => {
                      setForm({ ...form, email: event.target.value, otp: "" });
                      setOtpState({
                        loading: false,
                        sent: false,
                        verified: false,
                        message: "",
                      });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 transition focus:border-indigo-400 focus:bg-white"
                  />
                  {(isSetup || isInvite || isForgot) && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpState.loading}
                      className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {otpState.loading ? "Sending..." : "Send OTP"}
                    </button>
                  )}
                </div>
              </label>
            )}

            {(isSetup || isInvite || isForgot) && (
              <label className="block space-y-1 text-sm">
                <span>Email verification OTP</span>
                <div className="flex gap-2">
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={form.otp}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        otp: event.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 transition focus:border-indigo-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpState.loading || !form.otp}
                    className="rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {otpState.verified ? "Verified" : "Verify"}
                  </button>
                </div>
                {otpState.message && (
                  <span
                    className={`block text-xs ${otpState.verified ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    {otpState.message}
                  </span>
                )}
              </label>
            )}

            {isInvite && (
              <label className="block space-y-1 text-sm">
                <span>Phone (optional)</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 transition focus:border-indigo-400 focus:bg-white"
                />
              </label>
            )}

            {(isLogin ||
              isSetup ||
              isInvite ||
              isReset ||
              (isForgot && otpState.verified)) && (
              <label className="block space-y-1 text-sm">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  minLength={12}
                  maxLength={128}
                  required
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 transition focus:border-indigo-400 focus:bg-white"
                />
                {!isLogin && (
                  <span className="block text-xs text-slate-500">
                    Use at least 12 characters.
                  </span>
                )}
              </label>
            )}

            {isForgot && otpState.verified && (
              <label className="block space-y-1 text-sm">
                <span>Confirm new password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm({ ...form, confirmPassword: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900"
                />
              </label>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              >
                {notice}
              </p>
            )}

            {(isLogin ||
              isSetup ||
              isInvite ||
              isReset ||
              (isForgot && otpState.verified)) && (
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95 disabled:opacity-60"
              >
                <LockKeyhole size={17} />
                {submitting
                  ? "Working…"
                  : isSetup
                    ? "Create shop account"
                    : isInvite
                      ? "Create account"
                      : isReset || isForgot
                        ? "Update password"
                        : "Sign in"}
                {!submitting && <ArrowRight size={16} />}
              </button>
            )}
          </form>
        )}
        {isLogin && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setScreen("forgot");
                setError("");
                setOtpState({
                  loading: false,
                  sent: false,
                  verified: false,
                  message: "",
                });
              }}
              className="font-medium text-sky-700 hover:text-sky-900"
            >
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => {
                setScreen("signup");
                setError("");
              }}
              className="font-semibold text-slate-900 hover:text-sky-800"
            >
              Sign up
            </button>
          </div>
        )}
        {isForgot && (
          <button
            type="button"
            onClick={() => {
              setScreen("login");
              setError("");
              setOtpState({
                loading: false,
                sent: false,
                verified: false,
                message: "",
              });
            }}
            className="mt-4 w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Back to sign in
          </button>
        )}
        <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
          Multiple vendors can onboard their own shops. Invite admin, manager,
          and staff users after the shop account is created.
        </p>
      </section>
    </main>
  );
}
