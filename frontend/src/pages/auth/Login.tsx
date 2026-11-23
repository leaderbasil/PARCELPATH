import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/common/Button";
import { DashboardIcon, EyeIcon, EyeOffIcon, UsersIcon } from "@/components/common/Icons";
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
  const [showPassword, setShowPassword] = useState(false);
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
      setFormError(
        error instanceof ApiRequestError
          ? getErrorMessage(error.code, error.message)
          : getErrorMessage("INTERNAL_ERROR")
      );
    } finally {
      setDemoLoadingRole(null);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-7 text-center">
        <h1 className="text-2xl font-bold leading-snug text-text sm:text-3xl">
          {UI.auth.welcomeBack}
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">{UI.auth.welcomeBackSubtitle}</p>
      </div>

      <form noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm leading-6 text-danger-strong"
          >
            <span aria-hidden="true" className="mt-0.5 font-bold">!</span>
            <p>{formError}</p>
          </div>
        ) : null}

        <Input
          label={UI.auth.email}
          type="email"
          inputMode="email"
          autoComplete="username"
          className="h-11 text-base"
          error={errors.email?.message}
          {...register("email")}
        />

        <div>
          <div className="relative">
            <Input
              label={UI.auth.password}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="h-11 pe-12 text-base"
              error={errors.password?.message}
              {...register("password")}
            />
            <button
              type="button"
              aria-label={showPassword ? UI.auth.hidePassword : UI.auth.showPassword}
              title={showPassword ? UI.auth.hidePassword : UI.auth.showPassword}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute end-0 top-[26px] flex h-11 w-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text"
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" loading={isSubmitting} className="h-11 w-full text-base">
          {isSubmitting ? UI.auth.signingIn : UI.nav.login}
        </Button>
      </form>

      {demoLoginEnabled ? (
        <div className="mt-7 border-t border-border pt-6">
          <Button
            variant="secondary"
            loading={demoLoadingRole !== null}
            disabled={isSubmitting}
            onClick={() => setDemoPickerOpen(true)}
            className="h-11 w-full text-sm"
          >
            {UI.auth.demoLogin}
          </Button>
        </div>
      ) : null}

      <div className="mt-7 border-t border-border pt-5 text-center text-sm text-text-muted">
        {UI.auth.noAccount}{" "}
        <Link to="/register" className="font-semibold text-primary-strong hover:underline">
          {UI.auth.registerTitle}
        </Link>
      </div>

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
