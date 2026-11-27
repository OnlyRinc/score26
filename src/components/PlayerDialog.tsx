"use client";
import { useState } from "react";
import { useStore } from "@/lib/store/store";
import type { Player } from "@/lib/store/types";
import { Button, Field, Modal, inputCls } from "./ui";

export function PlayerDialog({ value, onClose, onCreated }: { value: Partial<Player> | null; onClose: () => void; onCreated?: (id: string) => void }) {
  const addPlayer = useStore((s) => s.addPlayer);
  const updatePlayer = useStore((s) => s.updatePlayer);
  const deletePlayer = useStore((s) => s.deletePlayer);
  const [form, setForm] = useState<Partial<Player>>({});
  const [lastValue, setLastValue] = useState<Partial<Player> | null>(null);
  if (value !== lastValue) {
    setLastValue(value);
    setForm(value ?? {});
  }
  const save = () => {
    const data = { firstName: (form.firstName ?? "").trim(), lastName: (form.lastName ?? "").trim(), nickname: (form.nickname ?? "").trim(), walkOn: (form.walkOn ?? "").trim() };
    if (!data.firstName && !data.nickname) return;
    if (value?.id) updatePlayer(value.id, data);
    else {
      const id = addPlayer(data);
      onCreated?.(id);
    }
    onClose();
  };
  return (
    <Modal open={!!value} onClose={onClose} title={value?.id ? "Spieler bearbeiten" : "Neuer Spieler"}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Spitzname (groß im Spiel)">
          <input autoFocus className={inputCls} value={form.nickname ?? ""} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="z. B. The Power" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vorname"><input className={inputCls} value={form.firstName ?? ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Nachname"><input className={inputCls} value={form.lastName ?? ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
        </div>
        <Field label="Walk-on-Song">
          <input className={inputCls} value={form.walkOn ?? ""} onChange={(e) => setForm({ ...form, walkOn: e.target.value })} placeholder="z. B. Chase the Sun – Planet Funk" />
        </Field>
        <div className="flex gap-3 pt-2">
          {value?.id && (
            <Button variant="danger" onClick={() => { if (confirm("Spieler wirklich löschen?")) { deletePlayer(value.id!); onClose(); } }}>Löschen</Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit">Speichern</Button>
        </div>
      </form>
    </Modal>
  );
}
