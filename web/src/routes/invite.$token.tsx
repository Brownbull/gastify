import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInvitePreview, useJoinInvite } from "@/hooks/useGroups";
import { useI18n } from "@/hooks/useI18n";
import { useUiStore } from "@/stores/uiStore";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const setActiveScope = useUiStore((s) => s.setActiveScope);
  const { data: preview, isLoading, isError } = useInvitePreview(token);
  const joinInvite = useJoinInvite();

  return (
    <div className="mx-auto max-w-md py-10">
      <div
        className="space-y-4 rounded-2xl border p-6 text-center"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
      >
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {t("invite.title")}
        </h1>

        {isLoading && <p style={{ color: "var(--text-muted)" }}>…</p>}

        {(isError || (!isLoading && !preview)) && (
          <p data-testid="invite-error" style={{ color: "var(--danger, #dc2626)" }}>
            {t("invite.notFound")}
          </p>
        )}

        {preview && (
          <>
            <p className="text-lg font-semibold" style={{ color: "var(--primary)" }}>
              🏠 {preview.name}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {preview.member_count} {t("group.members")}
            </p>

            {preview.expired ? (
              <p style={{ color: "var(--danger, #dc2626)" }}>{t("invite.expired")}</p>
            ) : preview.already_member ? (
              <button
                type="button"
                onClick={() => {
                  setActiveScope({ kind: "group", id: preview.group_id, name: preview.name });
                  void navigate({ to: "/" });
                }}
                className="w-full rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: "var(--primary)", color: "white" }}
              >
                {t("group.viewDashboard")}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="invite-join"
                  disabled={joinInvite.isPending}
                  onClick={() =>
                    joinInvite.mutate(token, {
                      onSuccess: (group) => {
                        setActiveScope({ kind: "group", id: group.id, name: group.name });
                        void navigate({ to: "/" });
                      },
                    })
                  }
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: "var(--primary)", color: "white" }}
                >
                  {joinInvite.isPending ? t("invite.joining") : t("invite.join")}
                </button>
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/" })}
                  className="rounded-lg border px-4 py-2 text-sm"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  {t("invite.decline")}
                </button>
              </div>
            )}

            {joinInvite.isError && (
              <p data-testid="invite-join-error" role="alert" style={{ color: "var(--danger, #dc2626)" }}>
                {t("invite.joinError")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
