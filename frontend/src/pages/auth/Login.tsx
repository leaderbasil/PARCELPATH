import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/common/Button";
import { DashboardIcon, UsersIcon } from "@/components/common/Icons";
import { Input } from "@/components/common/Input";
import { Modal } from "@/components/common/Modal";
import { AuthLayout } from "@/components/layout/AuthLayout";
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
    <AuthLayout>
      <div className="mb-8">
        <p className="text-sm font-medium text-primary-strong">{UI.appName}</p>
        <h1 className="mt-2 text-3xl font-bold text-text">{UI.auth.welcomeBack}</h1>
        <p className="mt-2 text-sm text-text-muted">{UI.auth.welcomeBackSubtitle}</p>
      </div>

      <form noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-5">
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
        <Button type="submit" loading={isSubmitting} className="h-11 w-full text-base">
          {UI.nav.login}
        </Button>
      </form>

      {demoLoginEnabled ? (
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-text-muted">{UI.auth.demoDivider}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-4 rounded-card border border-primary/20 bg-primary-soft/40 p-4">
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
        </div>
      ) : null}

      <p className="mt-8 text-center text-sm text-text-muted">
        {UI.auth.noAccount}{" "}
        <Link to="/register" className="font-medium text-primary-strong underline">
          {UI.auth.registerTitle}
        </Link>
      </p>

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
    </AuthLayout>
  );
}
