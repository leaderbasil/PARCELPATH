import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { DateText } from "@/components/common/DateText";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Input } from "@/components/common/Input";
import { LoadingState } from "@/components/common/LoadingState";
import { Modal } from "@/components/common/Modal";
import { config } from "@/config";
import { getCurrentLocale, getTranslation, useUI, type Locale } from "@/i18n";
import { getErrorMessage } from "@/constants/messages";
import { useCreateUser, useSetUserStatus, useUpdateUser, useUsers } from "@/hooks/useUsers";
import { ApiRequestError } from "@/services/api";
import type { Role, UserCreate } from "@/types/domain";

function buildSchema(locale: Locale) {
  const messages = getTranslation(locale).validation;
  return z.object({
    full_name: z.string().trim().min(2, messages.nameTooShort).max(150),
    email: z.string().trim().email(messages.emailInvalid),
    password: z.string().min(8, messages.passwordTooShort).max(72),
    role: z.enum(["ADMIN", "CUSTOMER"]),
    phone: z.string(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

const EMPTY_VALUES: FormValues = {
  full_name: "",
  email: "",
  password: "",
  role: "CUSTOMER",
  phone: "",
};

function parseRole(value: string): Role | undefined {
  return value === "ADMIN" || value === "CUSTOMER" ? value : undefined;
}

function optionalPhone(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function errorText(error: unknown): string {
  return error instanceof ApiRequestError
    ? getErrorMessage(error.code, error.message)
    : getErrorMessage("INTERNAL_ERROR");
}

export default function AdminUsers() {
  const ui = useUI();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const users = useUsers({
    page,
    page_size: config.pageSize,
    ...(search ? { search } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(activeFilter === "active" ? { is_active: true } : {}),
    ...(activeFilter === "inactive" ? { is_active: false } : {}),
  });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const setUserStatus = useSetUserStatus();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: (values, context, options) =>
      zodResolver(buildSchema(getCurrentLocale()))(values, context, options),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!formOpen) return;
    setSubmitError(null);
    reset(EMPTY_VALUES);
  }, [formOpen, reset]);

  const totalPages = Math.max(1, Math.ceil((users.data?.total ?? 0) / config.pageSize));
  const closeForm = () => {
    setFormOpen(false);
    reset(EMPTY_VALUES);
  };

  const onSubmit = (values: FormValues) => {
    setSubmitError(null);
    const payload: UserCreate = {
      full_name: values.full_name.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
      role: values.role,
      phone: optionalPhone(values.phone),
    };
    createUser.mutate(payload, {
      onSuccess: () => {
        closeForm();
        setPage(1);
      },
      onError: (error: unknown) => setSubmitError(errorText(error)),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={() => setFormOpen(true)}>{ui.admin.newUser}</Button>
      </div>

      <form
        className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(searchDraft.trim());
          setPage(1);
        }}
      >
        <Input
          name="search"
          label={ui.common.search}
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
        <div className="w-full">
          <label htmlFor="role-filter" className="mb-1 block text-sm font-medium text-text">
            {ui.nav.users}
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(parseRole(event.target.value) ?? "");
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{ui.common.all}</option>
            <option value="ADMIN">{ui.admin.roleAdmin}</option>
            <option value="CUSTOMER">{ui.admin.roleCustomer}</option>
          </select>
        </div>
        <div className="w-full">
          <label htmlFor="active-filter" className="mb-1 block text-sm font-medium text-text">
            {ui.admin.active}
          </label>
          <select
            id="active-filter"
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value as "all" | "active" | "inactive");
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">{ui.common.all}</option>
            <option value="active">{ui.admin.active}</option>
            <option value="inactive">{ui.admin.inactive}</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">{ui.common.search}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearchDraft("");
              setSearch("");
              setRoleFilter("");
              setActiveFilter("all");
              setPage(1);
            }}
          >
            {ui.common.cancel}
          </Button>
        </div>
      </form>

      {users.isLoading ? (
        <LoadingState variant="adminUsers" />
      ) : users.error ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : !users.data || users.data.items.length === 0 ? (
        <EmptyState message={ui.common.noResults} />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-background text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{ui.auth.fullName}</th>
                <th className="px-4 py-3 font-medium">{ui.auth.email}</th>
                <th className="px-4 py-3 font-medium">{ui.nav.users}</th>
                <th className="px-4 py-3 font-medium">{ui.admin.active}</th>
                <th className="px-4 py-3 font-medium">{ui.orders.date}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.data.items.map((user) => (
                <tr key={user.id} className="text-text">
                  <td className="px-4 py-3 font-medium">{user.full_name}</td>
                  <td className="px-4 py-3 text-text-muted" dir="ltr">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`${ui.nav.users} - ${user.full_name}`}
                      value={user.role}
                      disabled={updateUser.isPending}
                      onChange={(event) => {
                        const role = parseRole(event.target.value);
                        if (role && role !== user.role) {
                          updateUser.mutate({ id: user.id, payload: { role } });
                        }
                      }}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="ADMIN">{ui.admin.roleAdmin}</option>
                      <option value="CUSTOMER">{ui.admin.roleCustomer}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success-strong">
                        {ui.admin.active}
                      </span>
                    ) : (
                      <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger-strong">
                        {ui.admin.inactive}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    <DateText value={user.created_at} />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="secondary"
                      loading={setUserStatus.isPending}
                      onClick={() =>
                        setUserStatus.mutate({ id: user.id, payload: { is_active: !user.is_active } })
                      }
                    >
                      {user.is_active ? ui.admin.inactive : ui.admin.active}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {users.data && users.data.total > 0 ? (
        <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface px-4 py-3 shadow-card">
          <span className="text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {ui.common.previous}
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {ui.common.next}
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={formOpen}
        title={`${ui.common.add} ${ui.nav.users}`}
        onClose={closeForm}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={createUser.isPending}>
              {ui.common.cancel}
            </Button>
            <Button type="submit" form="user-form" loading={createUser.isPending}>
              {ui.common.add}
            </Button>
          </>
        }
      >
        <form
          id="user-form"
          className="space-y-4"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          noValidate
        >
          <Input label={ui.auth.fullName} error={errors.full_name?.message} {...register("full_name")} />
          <Input
            type="email"
            label={ui.auth.email}
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            type="password"
            label={ui.auth.password}
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="w-full">
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-text">
              {ui.nav.users}
            </label>
            <select
              id="role"
              {...register("role")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option value="CUSTOMER">{ui.admin.roleCustomer}</option>
              <option value="ADMIN">{ui.admin.roleAdmin}</option>
            </select>
          </div>
          <Input
            type="tel"
            label={ui.checkout.phone}
            error={errors.phone?.message}
            {...register("phone")}
          />
          {submitError ? (
            <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger-strong">
              {submitError}
            </p>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
