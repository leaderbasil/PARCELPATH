import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/common/Button";
import { DashboardIcon, UsersIcon } from "@/components/common/Icons";
import { Modal } from "@/components/common/Modal";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Input } from "@/components/common/Input";
import { getErrorMessage } from "@/constants/messages";
import { DEMO_AUTO_LOGIN_DISABLED_KEY, demoLoginEnabled } from "@/constants/demo";
import { UI } from "@/constants/ui";
import { useAuth } from "@/context/AuthContext";
import { ApiRequestError } from "@/services/api";
import { authService } from "@/services/auth.service";
import type { Role } from "@/types/domain";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "البريد الإلكتروني مطلوب")
    .email("أدخل بريدًا إلكترونيًا صحيحًا"),
  password: z
    .string()
    .min(1, "كلمة المرور مطلوبة")
    .min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف"),
});

type LoginValues = z.infer<typeof loginSchema>;

function readRedirectTarget(state: unknown): string | undefined {
  if (typeof state !== "object" || state === null || !("from" in state)) return undefined;
  const from: unknown = state.from;
  return typeof from === "string" && from.length > 0 ? from : undefined;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [demoPickerOpen, setDemoPickerOpen] = useState(false);
  const [demoLoadingRole, setDemoLoadingRole] = useState<Role | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues): Promise<void> => {
    setFormError(null);
    try {
      const token = await authService.login({ email: values.email, password: values.password });
      login(token.access_token, token.user, token.expires_in);
      const target =
        readRedirectTarget(location.state) ??
        (token.user.role === "ADMIN" ? "/admin" : "/");
      navigate(target, { replace: true });
    } catch (error: unknown) {
      if (error instanceof ApiRequestError && error.code === "NETWORK_ERROR" && demoLoginEnabled) {
        const demo = await authService.loginDemo("CUSTOMER");
        try {
          localStorage.removeItem(DEMO_AUTO_LOGIN_DISABLED_KEY);
        } catch {
          // Ignore storage failures.
        }
        login(demo.access_token, demo.user, demo.expires_in);
        navigate("/", { replace: true });
        return;
      }
      if (error instanceof ApiRequestError) {
        setFormError(getErrorMessage(error.code, error.message));
      } else {
        setFormError(getErrorMessage("INTERNAL_ERROR"));
      }
    }
  };
  const onDemoLogin = async (role: Role): Promise<void> => {
    setFormError(null);
    setDemoLoadingRole(role);
    try {
      const token = await authService.loginDemo(role);
      try {
        localStorage.removeItem(DEMO_AUTO_LOGIN_DISABLED_KEY);
      } catch {
        // Ignore storage failures.
      }
      login(token.access_token, token.user, token.expires_in);
      setDemoPickerOpen(false);
      const fallback = role === "ADMIN" ? "/admin" : "/";
      navigate(readRedirectTarget(location.state) ?? fallback, { replace: true });
    } catch (error: unknown) {
      setFormError(error instanceof ApiRequestError ? getErrorMessage(error.code, error.message) : getErrorMessage("INTERNAL_ERROR"));
    } finally {
      setDemoLoadingRole(null);
    }
  };

  return (
    <main className="relative mx-auto w-full max-w-2xl p-4 py-12 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 right-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/4 h-64 w-64 rounded-full bg-primary-soft blur-3xl" />
      </div>
      <div className="relative z-10 rounded-card border border-border bg-surface/90 p-8 shadow-card backdrop-blur sm:p-10">
        <ThemeToggle className="absolute end-4 top-4" />
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <BrandLogo showTagline />
          <h1 className="text-3xl font-bold text-text">{UI.auth.loginTitle}</h1>
        </div>
        <form noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
          <Input
            label={UI.auth.email}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label={UI.auth.password}
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          {formError ? (
            <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
              {formError}
            </p>
          ) : null}
          <Button type="submit" loading={isSubmitting} className="w-full">
            {UI.nav.login}
          </Button>
        </form>
        {demoLoginEnabled ? (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-center text-xs leading-relaxed text-text-muted">{UI.auth.demoHint}</p>
            <Button
              variant="secondary"
              loading={demoLoadingRole !== null}
              disabled={isSubmitting}
              onClick={() => setDemoPickerOpen(true)}
              className="w-full"
            >
              {UI.auth.demoLogin}
            </Button>
          </div>
        ) : null}

        <Modal
          open={demoPickerOpen}
          title={UI.auth.demoRoleTitle}
          onClose={() => setDemoPickerOpen(false)}
        >
          <p className="text-sm text-text-muted">{UI.auth.demoRoleHint}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={demoLoadingRole !== null}
              onClick={() => void onDemoLogin("CUSTOMER")}
              className="flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-4 text-start transition-colors hover:border-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UsersIcon className="text-primary-strong" />
              <span className="font-semibold text-text">{UI.auth.demoCustomer}</span>
              <span className="text-xs leading-relaxed text-text-muted">{UI.auth.demoCustomerDesc}</span>
            </button>
            <button
              type="button"
              disabled={demoLoadingRole !== null}
              onClick={() => void onDemoLogin("ADMIN")}
              className="flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-4 text-start transition-colors hover:border-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              <DashboardIcon className="text-primary-strong" />
              <span className="font-semibold text-text">{UI.auth.demoAdmin}</span>
              <span className="text-xs leading-relaxed text-text-muted">{UI.auth.demoAdminDesc}</span>
            </button>
          </div>
        </Modal>

        <p className="mt-6 text-center text-sm text-text-muted">
          {UI.auth.noAccount}{" "}
          <Link to="/register" className="text-primary-strong underline">
            {UI.auth.registerTitle}
          </Link>
        </p>
      </div>
    </main>
  );
}
