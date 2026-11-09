import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, initSession } from './api';
import { emptyItem, fields, summary, tabs, type Field } from './fields';
import type { CollectionName, Content } from '../lib/schema';
import './admin.css';

type Item = Record<string, unknown> & { id: string };
type Tab = (typeof tabs)[number]['key'];
interface Message { id: string; name: string; email: string; message: string; at: string }

function slug(s: string) {
  const base = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AdminApp({ user }: { user: string }) {
  const [tab, setTab] = useState<Tab>('projects');
  const [content, setContent] = useState<Content | null>(null);
  const [editing, setEditing] = useState<{ index: number; item: Item } | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err' | 'busy'; text: string } | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initSession();
        setContent(await api.getContent<Content>());
      } catch (e) {
        setStatus({ kind: 'err', text: (e as Error).message });
      }
    })();
  }, []);

  useEffect(() => {
    if (tab !== 'messages' || messages) return;
    api.getMessages<Message[]>().then(setMessages).catch((e) => setStatus({ kind: 'err', text: (e as Error).message }));
  }, [tab, messages]);

  const save = useCallback(async (next: Content, okText = 'Enregistré ✓') => {
    const prev = content;
    setContent(next);
    setStatus({ kind: 'busy', text: 'Enregistrement…' });
    try {
      const saved = await api.putContent<Content>(next);
      setContent(saved);
      setStatus({ kind: 'ok', text: okText });
      return true;
    } catch (e) {
      setContent(prev);
      setStatus({ kind: 'err', text: (e as Error).message });
      return false;
    }
  }, [content]);

  const logout = async () => {
    try { await api.logout(); } finally { location.replace('/admin/login'); }
  };

  const current = tabs.find((t) => t.key === tab)!;

  return (
    <div className="ad">
      <aside className="ad-side">
        <a href="/" className="ad-logo mono">EVRELY<span>.admin</span></a>
        <nav aria-label="Sections de l’admin" className="ad-tabs">
          {tabs.map((t) => (
            <button key={t.key} type="button" className={`mono ${t.key === tab ? 'on' : ''}`} aria-current={t.key === tab ? 'page' : undefined}
              onClick={() => { setTab(t.key); setEditing(null); }}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="ad-foot">
          <a href="/" className="mono" target="_blank" rel="noopener">← Voir le site public</a>
          <button type="button" className="mono ad-out" onClick={logout}>Se déconnecter</button>
        </div>
      </aside>

      <main className="ad-main">
        <div className="ad-head">
          <div>
            <p className="mono ad-crumb">ADMIN / {current.label.toUpperCase()}</p>
            <h1 className="disp">{current.label}</h1>
          </div>
          <p className="mono ad-who">Connecté : {user} · accès protégé</p>
        </div>
        <p className={`mono ad-status ${status?.kind ?? ''}`} role="status" aria-live="polite">{status?.text}</p>

        {!content && !status && <p className="mono">Chargement…</p>}

        {content && tab !== 'video' && tab !== 'messages' && (
          <CollectionEditor
            key={tab}
            name={tab}
            items={content[tab] as unknown as Item[]}
            editing={editing}
            setEditing={setEditing}
            onChange={(items, msg) => save({ ...content, [tab]: items } as Content, msg)}
            setStatus={setStatus}
          />
        )}

        {content && tab === 'video' && <VideoEditor content={content} onSave={(v) => save({ ...content, video: v })} />}

        {tab === 'messages' && (
          <MessagesView
            messages={messages}
            onDelete={async (id) => {
              try {
                await api.deleteMessage(id);
                setMessages((m) => m?.filter((x) => x.id !== id) ?? null);
              } catch (e) { setStatus({ kind: 'err', text: (e as Error).message }); }
            }}
          />
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CollectionEditor({ name, items, editing, setEditing, onChange, setStatus }: {
  name: CollectionName;
  items: Item[];
  editing: { index: number; item: Item } | null;
  setEditing: (e: { index: number; item: Item } | null) => void;
  onChange: (items: Item[], msg?: string) => Promise<boolean>;
  setStatus: (s: { kind: 'ok' | 'err' | 'busy'; text: string }) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = useMemo(() => items.map((i) => i.id), [items]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    onChange(arrayMove(items, from, to), 'Ordre enregistré ✓');
  };

  const remove = (index: number) => {
    const s = summary(name, items[index]);
    if (!confirm(`Supprimer « ${s.title} » ?`)) return;
    onChange(items.filter((_, i) => i !== index), 'Supprimé ✓');
    if (editing?.index === index) setEditing(null);
  };

  const submit = async (item: Item, index: number) => {
    const next = [...items];
    if (index === -1) next.push(item);
    else next[index] = item;
    if (await onChange(next, index === -1 ? 'Ajouté ✓' : 'Modifié ✓')) setEditing(null);
  };

  return (
    <div className="ad-cols">
      <section className="ad-list" aria-label="Éléments">
        <p className="mono ad-count">{items.length} ÉLÉMENT(S) · GLISSER (OU ESPACE + FLÈCHES) POUR RÉORDONNER</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}
          accessibility={{
            screenReaderInstructions: { draggable: 'Appuyez sur Espace pour saisir, flèches pour déplacer, Espace pour déposer, Échap pour annuler.' },
          }}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul>
              {items.map((it, i) => (
                <SortableRow key={it.id} id={it.id} {...summary(name, it)} onEdit={() => setEditing({ index: i, item: structuredClone(it) })} onDelete={() => remove(i)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <button type="button" className="mono ad-add" onClick={() => setEditing({ index: -1, item: { ...emptyItem(name), id: '' } as Item })}>+ Ajouter</button>
      </section>

      {editing && (
        <ItemForm
          key={`${editing.index}-${editing.item.id}`}
          fields={fields[name]}
          initial={editing.item}
          isNew={editing.index === -1}
          onCancel={() => setEditing(null)}
          onSubmit={(item) => submit({ ...item, id: item.id || slug(String(item.title ?? 'item')) } as Item, editing.index)}
          setStatus={setStatus}
        />
      )}
    </div>
  );
}

function SortableRow({ id, title, meta, onEdit, onDelete }: { id: string; title: string; meta: string; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li ref={setNodeRef} style={style} className={`ad-row ${isDragging ? 'drag' : ''}`}>
      <button type="button" className="ad-handle mono" aria-label={`Déplacer ${title}`} {...attributes} {...listeners}>⋮⋮</button>
      <div className="ad-rowtxt">
        <p className="ad-rowtitle">{title || '(sans titre)'}</p>
        <p className="mono ad-rowmeta">{meta}</p>
      </div>
      <button type="button" className="mono ad-btn" onClick={onEdit}>Modifier</button>
      <button type="button" className="mono ad-btn danger" onClick={onDelete} aria-label={`Supprimer ${title}`}>Supprimer</button>
    </li>
  );
}

function ItemForm({ fields, initial, isNew, onSubmit, onCancel, setStatus }: {
  fields: Field[];
  initial: Item;
  isNew: boolean;
  onSubmit: (item: Item) => void;
  onCancel: () => void;
  setStatus: (s: { kind: 'ok' | 'err' | 'busy'; text: string }) => void;
}) {
  const [item, setItem] = useState<Item>(initial);
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: unknown) => setItem((p) => ({ ...p, [k]: v }));

  const upload = async (f: Field, file: File | undefined) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setStatus({ kind: 'err', text: 'Fichier trop lourd (8 Mo max)' }); return; }
    setUploading(true);
    setStatus({ kind: 'busy', text: 'Envoi du fichier…' });
    try {
      const { ref } = await api.upload(file);
      set(f.name, ref);
      setStatus({ kind: 'ok', text: 'Fichier envoyé ✓ — pensez à enregistrer' });
    } catch (e) {
      setStatus({ kind: 'err', text: (e as Error).message });
    } finally { setUploading(false); }
  };

  return (
    <form className="ad-form" onSubmit={(e) => { e.preventDefault(); onSubmit(item); }}>
      <h2>{isNew ? 'Ajouter' : 'Modifier'}</h2>
      {fields.map((f) => {
        const id = `fld-${f.name}`;
        const v = item[f.name];
        if (f.type === 'checkbox') {
          return (
            <label key={f.name} className="ad-check" htmlFor={id}>
              <input id={id} type="checkbox" checked={Boolean(v)} onChange={(e) => set(f.name, e.target.checked)} /> {f.label}
            </label>
          );
        }
        return (
          <div key={f.name} className="ad-field">
            <label htmlFor={id} className="mono">{f.label.toUpperCase()}{f.required ? ' *' : ''}</label>
            {f.type === 'textarea' && <textarea id={id} rows={3} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} maxLength={600} />}
            {(f.type === 'text' || f.type === 'url') && (
              <input id={id} type={f.type === 'url' ? 'text' : 'text'} inputMode={f.type === 'url' ? 'url' : undefined} value={String(v ?? '')} required={f.required}
                onChange={(e) => set(f.name, e.target.value)} maxLength={500} placeholder={f.type === 'url' ? 'https://…' : undefined} />
            )}
            {f.type === 'select' && (
              <select id={id} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)}>
                {f.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            )}
            {f.type === 'file' && (
              <>
                <input id={id} type="file" accept={f.accept} disabled={uploading} onChange={(e) => upload(f, e.target.files?.[0])} />
                <p className="mono ad-ref">{v ? `Actuel : ${String(v)}` : 'Aucun fichier'}{v ? <button type="button" className="ad-link" onClick={() => set(f.name, '')}>retirer</button> : null}</p>
              </>
            )}
            {f.hint && <p className="mono ad-hint">{f.hint}</p>}
          </div>
        );
      })}
      <div className="ad-actions">
        <button type="submit" className="mono ad-primary" disabled={uploading}>{isNew ? '+ Ajouter' : 'Enregistrer'}</button>
        <button type="button" className="mono ad-btn" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}

function VideoEditor({ content, onSave }: { content: Content; onSave: (v: Content['video']) => void }) {
  const [v, setV] = useState(content.video);
  const [link, setLink] = useState(v.youtubeId ? `https://youtu.be/${v.youtubeId}` : '');
  const parse = (s: string) => {
    const m = s.trim().match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/) ?? s.trim().match(/^([A-Za-z0-9_-]{11})$/);
    return m ? m[1] : '';
  };
  const id = parse(link);
  return (
    <form className="ad-form wide" onSubmit={(e) => { e.preventDefault(); onSave({ ...v, youtubeId: id }); }}>
      <h2>Vidéo de soutenance</h2>
      <p className="ad-p">Collez le lien YouTube (vidéo « non répertoriée »). Elle n’est chargée sur la page publique qu’au clic.</p>
      <div className="ad-field"><label htmlFor="yt" className="mono">LIEN YOUTUBE</label>
        <input id="yt" type="text" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtu.be/…" />
        <p className="mono ad-hint">{link && !id ? 'Lien non reconnu' : id ? `Identifiant : ${id}` : 'Vide = « VIDÉO À AJOUTER »'}</p>
      </div>
      <div className="ad-field"><label htmlFor="vt" className="mono">TITRE</label><input id="vt" value={v.title} maxLength={160} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
      <div className="ad-field"><label htmlFor="vc" className="mono">LÉGENDE</label><textarea id="vc" rows={3} value={v.caption} maxLength={300} onChange={(e) => setV({ ...v, caption: e.target.value })} /></div>
      <div className="ad-actions"><button type="submit" className="mono ad-primary" disabled={Boolean(link) && !id}>Enregistrer</button></div>
    </form>
  );
}

function MessagesView({ messages, onDelete }: { messages: Message[] | null; onDelete: (id: string) => void }) {
  if (!messages) return <p className="mono">Chargement…</p>;
  if (messages.length === 0) return <p className="mono ad-p">Aucun message pour l’instant.</p>;
  return (
    <ul className="ad-msgs">
      {messages.map((m) => (
        <li key={m.id} className="ad-row msg">
          <div className="ad-rowtxt">
            <p className="ad-rowtitle">{m.name} — <a href={`mailto:${m.email}`}>{m.email}</a></p>
            <p className="mono ad-rowmeta">{new Date(m.at).toLocaleString('fr-FR')}</p>
            <p className="ad-msgtxt">{m.message}</p>
          </div>
          <button type="button" className="mono ad-btn danger" onClick={() => confirm('Supprimer ce message ?') && onDelete(m.id)}>Supprimer</button>
        </li>
      ))}
    </ul>
  );
}
