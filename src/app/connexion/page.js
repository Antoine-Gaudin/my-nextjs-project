"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const router = useRouter();

  // ─── Login state ───
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // ─── Forgot password state ───
  const [forgotEmail, setForgotEmail] = useState("");

  // ─── Register state ───
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidations, setPasswordValidations] = useState({
    hasUpperCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasMinLength: false,
  });

  // ─── Shared state ───
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const jwt = Cookies.get("jwt");
    if (jwt) router.push("/profil");
  }, [router]);

  // Read tab from URL hash
  useEffect(() => {
    if (window.location.hash === "#inscription") setMode("register");
  }, []);

  const resetFeedback = () => {
    setError("");
    setSuccess("");
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    resetFeedback();
    window.history.replaceState(null, "", newMode === "register" ? "#inscription" : newMode === "forgot" ? "#oubli" : "#connexion");
  };

  // ─── Password validation ───
  const validatePassword = (pwd) => {
    const v = {
      hasUpperCase: /[A-Z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      hasMinLength: pwd.length >= 6,
    };
    setPasswordValidations(v);
    return Object.values(v).every(Boolean);
  };

  // ─── Login handler ───
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    try {
      const response = await fetch(`/api/proxy/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || "Erreur de connexion");

      const jwt = data.jwt;
      Cookies.set("jwt", jwt, { expires: 7, sameSite: "strict", secure: window.location.protocol === "https:" });

      const userInfoResponse = await fetch(`/api/proxy/users/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const userInfoData = await userInfoResponse.json();
      Cookies.set("userInfo", JSON.stringify(userInfoData), { expires: 7, sameSite: "strict", secure: window.location.protocol === "https:" });

      // Notifier la NavBar du changement d'auth
      window.dispatchEvent(new Event("auth-change"));

      router.push("/profil");
    } catch (err) {
      console.error(err);
      setError("Identifiants invalides. Vérifiez votre email et mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Register handler ───
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    if (regPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }
    if (!validatePassword(regPassword)) {
      setError("Le mot de passe ne respecte pas tous les critères requis.");
      setLoading(false);
      return;
    }

    try {
      await fetch(`/api/proxy/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password: regPassword }),
      }).then(async (res) => {
        if (!res.ok) {
          const errData = await res.json();
          throw { response: { data: errData } };
        }
      });

      setSuccess("Compte créé avec succès ! Connexion en cours...");

      // Auto-login after registration
      try {
        const loginRes = await fetch(`/api/proxy/auth/local`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: email, password: regPassword }),
        });
        const loginData = await loginRes.json();
        const jwt = loginData.jwt;
        Cookies.set("jwt", jwt, { expires: 7, sameSite: "strict", secure: window.location.protocol === "https:" });

        const userInfoRes = await fetch(`/api/proxy/users/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const userInfoData = await userInfoRes.json();
        Cookies.set("userInfo", JSON.stringify(userInfoData), { expires: 7, sameSite: "strict", secure: window.location.protocol === "https:" });

        // Notifier la NavBar du changement d'auth
        window.dispatchEvent(new Event("auth-change"));

        setTimeout(() => router.push("/profil"), 1500);
      } catch {
        setSuccess("Compte créé ! Connectez-vous maintenant.");
        setTimeout(() => switchMode("login"), 2000);
      }
    } catch (err) {
      setError(
        err.response?.data?.error?.message || "Une erreur s'est produite. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot password handler ───
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    try {
      await fetch(`/api/proxy/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      // Message générique pour ne pas révéler si l'email existe
      setSuccess("Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.");
    } catch {
      setSuccess("Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Password validation check icon ───
  const ValidationCheck = ({ valid, label }) => (
    <li className={`flex items-center gap-2 text-xs transition-colors ${valid ? "text-emerald-400" : "text-gray-400"}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${valid ? "bg-emerald-500/20" : "bg-gray-800"}`}>
        {valid ? (
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
        )}
      </div>
      {label}
    </li>
  );

  // ─── Eye toggle button ───
  const EyeToggle = ({ show, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
      tabIndex={-1}
    >
      {show ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* ─── Background decor ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* ─── Logo ─── */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <h1 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
              Trad-Index
            </h1>
          </a>
        </div>

        {/* ─── Card ─── */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* ─── Tab switcher ─── */}
          <div className="flex border-b border-gray-800/80">
            <button
              onClick={() => switchMode("login")}
              className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                mode === "login" || mode === "forgot"
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {mode === "forgot" ? "Mot de passe oublié" : "Connexion"}
              {(mode === "login" || mode === "forgot") && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => switchMode("register")}
              className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                mode === "register"
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Créer un compte
              {mode === "register" && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
              )}
            </button>
          </div>

          {/* ─── Feedback messages ─── */}
          {(error || success) && (
            <div className={`mx-6 mt-5 px-4 py-3 rounded-xl text-sm flex items-center gap-3 ${
              error
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            }`}>
              {error ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {error || success}
            </div>
          )}

          {/* ─── Form content ─── */}
          <div className="p-6">
            {mode === "login" ? (
              /* ════════ LOGIN FORM ════════ */
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Email ou nom d&apos;utilisateur
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="login-email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      placeholder="votre@email.com"
                      className="w-full pl-11 pr-4 py-3 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      id="login-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm"
                    />
                    <EyeToggle show={showLoginPassword} onToggle={() => setShowLoginPassword(!showLoginPassword)} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-sm text-gray-400 hover:text-indigo-300 transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Créer un compte
                  </button>
                </div>
              </form>
            ) : mode === "forgot" ? (
              /* ════════ FORGOT PASSWORD FORM ════════ */
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <p className="text-sm text-gray-400">
                  Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>

                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Adresse email
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      id="forgot-email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      placeholder="votre@email.com"
                      className="w-full pl-11 pr-4 py-3 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer le lien de réinitialisation"
                  )}
                </button>

                <p className="text-center text-sm text-gray-400 pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Retour à la connexion
                  </button>
                </p>
              </form>
            ) : (
              /* ════════ REGISTER FORM ════════ */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="reg-username" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Nom d&apos;utilisateur
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="reg-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="MonPseudo"
                      className="w-full pl-11 pr-4 py-3 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Adresse email
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      id="reg-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="votre@email.com"
                      className="w-full pl-11 pr-4 py-3 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <input
                      type={showRegPassword ? "text" : "password"}
                      id="reg-password"
                      value={regPassword}
                      onChange={(e) => { setRegPassword(e.target.value); validatePassword(e.target.value); }}
                      required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm"
                    />
                    <EyeToggle show={showRegPassword} onToggle={() => setShowRegPassword(!showRegPassword)} />
                  </div>

                  {/* Password requirements */}
                  {regPassword.length > 0 && (
                    <ul className="mt-3 space-y-1.5 pl-1">
                      <ValidationCheck valid={passwordValidations.hasMinLength} label="Au moins 6 caractères" />
                      <ValidationCheck valid={passwordValidations.hasUpperCase} label="Une lettre majuscule" />
                      <ValidationCheck valid={passwordValidations.hasNumber} label="Un chiffre" />
                      <ValidationCheck valid={passwordValidations.hasSpecialChar} label="Un caractère spécial (!@#...)" />
                    </ul>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-confirm" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="reg-confirm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className={`w-full pl-11 pr-12 py-3 bg-gray-800/60 border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-all text-sm ${
                        confirmPassword && confirmPassword !== regPassword
                          ? "border-red-500/50 focus:ring-red-500/40 focus:border-red-500/40"
                          : confirmPassword && confirmPassword === regPassword
                          ? "border-emerald-500/50 focus:ring-emerald-500/40 focus:border-emerald-500/40"
                          : "border-gray-700/60 focus:ring-indigo-500/40 focus:border-indigo-500/40"
                      }`}
                    />
                    <EyeToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                  </div>
                  {confirmPassword && confirmPassword !== regPassword && (
                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Les mots de passe ne correspondent pas
                    </p>
                  )}
                  {confirmPassword && confirmPassword === regPassword && (
                    <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Les mots de passe correspondent
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Création en cours...
                    </>
                  ) : (
                    <>
                      Créer mon compte
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-gray-400 pt-1">
                  Déjà inscrit ?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Se connecter
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <p className="text-center text-xs text-gray-600 mt-6">
          En vous connectant, vous acceptez nos conditions d&apos;utilisation.
        </p>
      </div>
    </div>
  );
}
