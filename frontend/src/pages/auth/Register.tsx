import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { getErrorMessage } from "@/constants/messages";
import { getCurrentLocale, getTranslation, useUI, type Locale } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import { ApiRequestError } from "@/services/api";
import { authService } from "@/services/auth.service";

function buildSchema(locale: Locale) {
  const messages = getTranslation(locale).validation;
  return z
    .object({
      full_name: z.string().trim().min(2, messages.nameTooShort),
      email: z.string().min(1, messages.emailRequired).email(messages.emailInvalid),
      password: z.string().min(8, messages.passwordTooShort),
      confirmPassword: z.string().min(1, messages.confirmPasswordRequired),
      phone: z
        .string()
        .trim()
        .refine(
          (value) => !value || /^\+?[0-9]{7,15}$/.test(value.replace(/[\s-]/g, "")),
          messages.phoneInvalid
        )
        .optional(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: messages.passwordsMismatch,
      path: ["confirmPassword"],
    });
}

type RegisterValues = z.infer<ReturnType<typeof buildSchema>>;

export default function Register() {
  const ui = useUI();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: (values, context, options) =>
      zodResolver(buildSchema(getCurrentLocale()))(values, context, options),
    defaultValues: { full_name: "", email: "", password: "", confirmPassword: "", phone: "" },
  });

  const onSubmit = async (values: RegisterValues): Promise<void> => {
    setFormError(null);
    try {
      const phone = values.phone?.trim();
      await authService.register({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: phone && phone.length > 0 ? phone : undefined,
      });
      const token = await authService.login({
        email: values.email.trim(),
        password: values.password,
      });
      login(token.access_token, token.user, token.expires_in);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      if (error instanceof ApiRequestError) {
        setFormError(getErrorMessage(error.code, error.message));
      } else {
        setFormError(getErrorMessage("INTERNAL_ERROR"));
      }
    }
  };

  return (
    <AuthLayout>
      <div className="mb-7 text-center">
        <p className="text-sm font-medium text-primary-strong">{ui.appName}</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug text-text sm:text-3xl">
          {ui.auth.createAccount}
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">{ui.auth.createAccountSubtitle}</p>
      </div>

      <form noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-5">
        <Input
          label={ui.auth.fullName}
          autoComplete="name"
          error={errors.full_name?.message}
          {...register("full_name")}
        />
        <Input
          label={ui.auth.email}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label={ui.auth.password}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label={ui.auth.confirmPassword}
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Input label={ui.checkout.phone} type="tel" error={errors.phone?.message} {...register("phone")} />
        {formError ? (
          <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" loading={isSubmitting} className="h-11 w-full text-base">
          {ui.nav.register}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-muted">
        {ui.auth.haveAccount}{" "}
        <Link to="/login" className="font-medium text-primary-strong underline">
          {ui.nav.login}
        </Link>
      </p>
    </AuthLayout>
  );
}
