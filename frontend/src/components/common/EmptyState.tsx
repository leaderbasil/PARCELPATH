export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
      {message}
    </div>
  );
}
