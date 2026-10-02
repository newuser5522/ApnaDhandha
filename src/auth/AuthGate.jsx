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
                : status.hasUsers
                  ? "login"
                  : "bootstrap",
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
  const [form, setForm] = useState({
    name: "",
    shopName: "",
    email: state.invitation?.email || state.resetInfo?.email || "",
    phone: "",
    password: "",
    bootstrapToken: "",
    otp: "",
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

  const isSetup = state.mode === "bootstrap";
  const isInvite = state.mode === "invite";
  const isReset = state.mode === "reset";
  const isLogin = state.mode === "login";
  const otpPurpose = isSetup ? "bootstrap" : isInvite ? "invite" : "reset";
  const emailForOtp = (
    isSetup || isInvite ? form.email : state.resetInfo?.email || form.email
  ).trim();

  const handleSendOtp = async () => {
    const email = emailForOtp;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email to receive the verification code.");
      return;
    }

    setOtpState({ loading: true, sent: false, verified: false, message: "" });
    setError("");
    try {
      const result = await apiRequest("/api/auth/send-otp", {
        method: "POST",
        body: { email, purpose: otpPurpose },
      });
      setForm((current) => ({ ...current, otp: result.otp }));
      setOtpState({
        loading: false,
        sent: true,
        verified: false,
        message: `Verification code sent to ${email}. Demo code: ${result.otp}`,
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
      if ((isSetup || isInvite) && !otpState.verified) {
        setError("Verify your email with the OTP before continuing.");
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
          body: { ...form, otp: form.otp, token: state.inviteToken },
        });
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
      : isReset
        ? "Set a new password"
        : isLogin
          ? "Sign in to Apna Dhandha"
          : "Authentication service unavailable";

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(135deg,#f8fafc_0%,#eff6ff_35%,#fff7ed_100%)] px-4 py-10">
      <section className="w-full max-w-lg rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-teal-500 text-white shadow-lg shadow-indigo-500/30">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Apna Dhandha
            </p>
            <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
          </div>
        </div>

        {state.mode === "unavailable" ? (
          <div className="space-y-4">
            <p role="alert" className="text-sm text-red-700">
              {state.error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95"
            >
              Retry
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
                    Invited as <strong>{state.invitation.role}</strong> for{" "}
                    <strong>{state.invitation.email}</strong>
                  </>
                ) : (
                  <>
                    Reset password for <strong>{state.resetInfo.email}</strong>
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

            {(isLogin || isSetup) && (
              <label className="block space-y-1 text-sm">
                <span>Email</span>
                <div className="flex gap-2">
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value, otp: "" })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 transition focus:border-indigo-400 focus:bg-white"
                  />
                  {(isSetup || isInvite) && (
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

            {(isSetup || isInvite) && (
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

            {(isLogin || isSetup || isInvite || isReset) && (
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

            {(isLogin || isSetup || isInvite || isReset) && (
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95 disabled:opacity-60"
              >
                <LockKeyhole size={17} />
                {submitting
                  ? "Working…"
                  : isSetup
                    ? "Create shop account"
                    : isInvite
                      ? "Create account"
                      : isReset
                        ? "Update password"
                        : "Sign in"}
                {!submitting && <ArrowRight size={16} />}
              </button>
            )}
          </form>
        )}
        <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
          Multiple vendors can onboard their own shops. Invite admin, manager,
          and staff users after the shop account is created.
        </p>
      </section>
    </main>
  );
}
