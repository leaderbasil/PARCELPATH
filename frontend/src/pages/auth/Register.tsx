import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { getErrorMessage } from "@/constants/messages";
import { UI } from "@/constants/ui";
import { useAuth } from "@/context/AuthContext";
import { ApiRequestError } from "@/services/api";
import { authService } from "@/services/auth.service";

const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "الاسم يجب ألا يقل عن حرفين"),
    email: z
      .string()
      .min(1, "البريد الإلكتروني مطلوب")
      .email("أدخل بريدًا إلكترونيًا صحيحًا"),
    password: z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف"),
    confirmPassword: z.string().min(1, "يرجى تأكيد كلمة المرور"),
    phone: z.string().optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
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
    <main className="mx-auto w-full max-w-2xl p-4 py-12 sm:px-6">
      <div className="relative rounded-card border border-border bg-surface p-8 shadow-card sm:p-10">
        <ThemeToggle className="absolute end-4 top-4" />
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <BrandLogo showTagline />
          <h1 className="text-3xl font-bold text-text">{UI.auth.registerTitle}</h1>
        </div>
        <form noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
          <Input
            label={UI.auth.fullName}
            autoComplete="name"
            error={errors.full_name?.message}
            {...register("full_name")}
          />
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
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label={UI.auth.confirmPassword}
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <Input label={UI.checkout.phone} type="tel" error={errors.phone?.message} {...register("phone")} />
          {formError ? (
            <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
              {formError}
            </p>
          ) : null}
          <Button type="submit" loading={isSubmitting} className="w-full">
            {UI.nav.register}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-text-muted">
          {UI.auth.haveAccount}{" "}
          <Link to="/login" className="text-primary-strong underline">
            {UI.nav.login}
          </Link>
        </p>
      </div>
    </main>
  );
}
