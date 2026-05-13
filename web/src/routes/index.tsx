import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
        {t("dashboard.title")}
      </h1>
      <p style={{ color: "var(--text-secondary)" }}>{t("dashboard.welcome")}</p>
    </div>
  );
}
