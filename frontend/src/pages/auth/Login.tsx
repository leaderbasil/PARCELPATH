import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { getErrorMessage } from "@/constants/messages";
import { UI } from "@/constants/ui";
import { useAuth } from "@/context/AuthContext";
import { ApiRequestError } from "@/services/api";
import { authService } from "@/services/auth.service";

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

const PARCELPATH_LOGO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 120'><rect width='420' height='120' rx='20' fill='%23EEF2FF'/><text x='28' y='78' font-family='Segoe UI,sans-serif' font-size='42' font-weight='700' fill='%234F46E5'>PARCELPATH</text></svg>";

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
      if (error instanceof ApiRequestError) {
        setFormError(getErrorMessage(error.code, error.message));
      } else {
        setFormError(getErrorMessage("INTERNAL_ERROR"));
      }
    }
  };

  return (
    <main className="mx-auto max-w-md p-4 py-10">
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <img
          src={PARCELPATH_LOGO}
          alt="PARCELPATH"
          className="mx-auto mb-4 h-16 w-auto object-contain"
        />
        <h1 className="mb-6 text-2xl font-bold text-text">{UI.auth.loginTitle}</h1>
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
