import { useState } from "react";
import { Modal } from "@design-system/atoms/Modal";
import { Button } from "@design-system/atoms/Button";
import { PixelIcon } from "@design-system/assets/PixelIcon";

/**
 * LeaveGroupDialog — the keep-vs-delete choice when leaving a group (backend
 * POST /leave delete_shared, D82). "Mantener" keeps your shared copies in the
 * group totals (invisible history); "Eliminar" voids them from the aggregates.
 */
export function LeaveGroupDialog({ open, groupName, onClose, onLeave }: { open: boolean; groupName: string; onClose: () => void; onLeave: (deleteShared: boolean) => void }) {
  const [deleteShared, setDeleteShared] = useState(false);
  const close = () => { setDeleteShared(false); onClose(); };

  const Choice = ({ active, title, body, onPick }: { active: boolean; title: string; body: string; onPick: () => void }) => (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={`flex items-start gap-gt-10 rounded-gt-xl border-2 p-gt-12 text-left transition duration-150 ease-gt-bounce ${
        active ? "border-gt-line-strong bg-gt-primary-soft shadow-gt-xs" : "border-gt-line bg-gt-surface hover:bg-gt-bg-3"
      }`}
    >
      <span className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-gt-pill border-2 ${active ? "border-gt-primary bg-gt-primary" : "border-gt-line-strong bg-gt-surface"}`}>
        {active ? <span className="h-2 w-2 rounded-gt-pill bg-gt-surface" /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink">{title}</span>
        <span className="text-gt-xs font-medium text-gt-ink-2">{body}</span>
      </span>
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title="Salir del grupo"
      footer={
        <div className="flex justify-end gap-gt-8">
          <Button variant="ghost" size="sm" onClick={close}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={() => { onLeave(deleteShared); close(); }}>Salir</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-gt-10">
        <p className="text-gt-sm font-medium text-gt-ink-2">
          Vas a salir de <span className="font-extrabold text-gt-ink">{groupName}</span>. ¿Qué hacemos con lo que compartiste?
        </p>
        <Choice active={!deleteShared} title="Mantener lo que compartí" body="Tus gastos siguen en los totales del grupo (sin tu nombre)." onPick={() => setDeleteShared(false)} />
        <Choice active={deleteShared} title="Eliminar mis datos del grupo" body="Tus gastos se quitan de los totales del grupo." onPick={() => setDeleteShared(true)} />
      </div>
    </Modal>
  );
}

/** DeleteGroupDialog — owner-only destructive confirm (backend DELETE /groups/:id). */
export function DeleteGroupDialog({ open, groupName, onClose, onDelete }: { open: boolean; groupName: string; onClose: () => void; onDelete: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="¿Eliminar grupo?"
      footer={
        <div className="flex justify-end gap-gt-8">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={() => { onDelete(); onClose(); }}>Eliminar grupo</Button>
        </div>
      }
    >
      <div className="flex items-start gap-gt-10">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-negative/40 bg-gt-negative/10">
          <PixelIcon name="status-warning" size={22} />
        </span>
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          <span className="font-extrabold text-gt-ink">{groupName}</span> y todo lo compartido en él se eliminarán para todos los miembros. Esta acción no se puede deshacer.
        </p>
      </div>
    </Modal>
  );
}
