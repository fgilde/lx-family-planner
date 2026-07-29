import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CloudUpload,
  Download,
  File,
  FileImage,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  LoaderCircle,
  Maximize2,
  RefreshCw,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import {
  plannerApiFetch,
  plannerApiRequest
} from '../../utils/apiConfig';

const FILE_LIMIT_BYTES = 25 * 1024 * 1024;

function fileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function fileDate(value) {
  if (!value) return 'Noch kein Datum';
  return new Date(value).toLocaleString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function entryIcon(entry) {
  if (entry.type === 'folder') return Folder;
  if (entry.mimeType?.startsWith('image/')) return FileImage;
  if (
    entry.mimeType?.startsWith('text/') ||
    entry.mimeType === 'application/pdf'
  ) {
    return FileText;
  }
  return File;
}

async function responseError(response) {
  try {
    const data = await response.json();
    return data?.error || 'Die Datei konnte nicht geladen werden.';
  } catch {
    return 'Die Datei konnte nicht geladen werden.';
  }
}

export default function CloudFileBrowser() {
  const { showToast } = useFamily();
  const [path, setPath] = useState('');
  const [folderName, setFolderName] = useState('Familienordner');
  const [entries, setEntries] = useState([]);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [dragging, setDragging] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const fileInputRef = useRef(null);

  const load = async (nextPath = path, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await plannerApiRequest(
        `/api/integrations/nextcloud/files?path=${encodeURIComponent(
          nextPath
        )}`
      );
      setPath(data.path || '');
      setFolderName(data.folder || 'Familienordner');
      setEntries(data.entries || []);
      setStorage(data.storage || null);
    } catch (error) {
      showToast('Cloud-Ordner nicht erreichbar', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('');
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const breadcrumbs = useMemo(() => {
    const pieces = path.split('/').filter(Boolean);
    return [
      { name: folderName, path: '' },
      ...pieces.map((name, index) => ({
        name,
        path: pieces.slice(0, index + 1).join('/')
      }))
    ];
  }, [folderName, path]);

  const uploadFiles = async fileList => {
    const files = [...(fileList || [])];
    if (!files.length || busy) return;
    const oversized = files.find(file => file.size > FILE_LIMIT_BYTES);
    if (oversized) {
      showToast(
        'Datei zu groß',
        `${oversized.name} ist größer als 25 MB.`,
        'warning'
      );
      return;
    }
    setBusy('upload');
    let uploaded = 0;
    for (const file of files.slice(0, 20)) {
      try {
        await plannerApiRequest(
          `/api/integrations/nextcloud/files/file?path=${encodeURIComponent(
            path
          )}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-LX-File-Name': encodeURIComponent(file.name),
              'X-LX-File-Type':
                file.type || 'application/octet-stream'
            },
            body: await file.arrayBuffer()
          }
        );
        uploaded += 1;
      } catch (error) {
        showToast(
          `${file.name} nicht hochgeladen`,
          error.message,
          'error'
        );
      }
    }
    setBusy('');
    setDragging(false);
    if (uploaded) {
      await load(path, { silent: true });
      showToast(
        uploaded === 1 ? 'Datei hochgeladen' : 'Dateien hochgeladen',
        `${uploaded} Datei${uploaded === 1 ? '' : 'en'} liegt jetzt im Familienordner.`,
        'success'
      );
    }
  };

  const createFolder = async event => {
    event.preventDefault();
    if (!newFolderName.trim() || busy) return;
    setBusy('folder');
    try {
      await plannerApiRequest(
        '/api/integrations/nextcloud/files/folder',
        {
          method: 'POST',
          body: JSON.stringify({
            path,
            name: newFolderName.trim()
          })
        }
      );
      setNewFolderName('');
      setNewFolderOpen(false);
      await load(path, { silent: true });
      showToast(
        'Ordner angelegt',
        'Der neue Bereich ist sofort in Nextcloud verfügbar.',
        'success'
      );
    } catch (error) {
      showToast('Ordner nicht angelegt', error.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const openPreview = async entry => {
    if (entry.type === 'folder') {
      await load(entry.path);
      return;
    }
    setBusy(`preview:${entry.path}`);
    setPreview(entry);
    setPreviewText('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    try {
      const response = await plannerApiFetch(
        `/api/integrations/nextcloud/files/content?inline=true&path=${
          encodeURIComponent(entry.path)
        }`
      );
      if (!response.ok) throw new Error(await responseError(response));
      const blob = await response.blob();
      if (entry.mimeType?.startsWith('text/')) {
        setPreviewText((await blob.text()).slice(0, 200_000));
      } else {
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      setPreview(null);
      showToast('Vorschau nicht verfügbar', error.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const downloadEntry = async entry => {
    setBusy(`download:${entry.path}`);
    try {
      const response = await plannerApiFetch(
        `/api/integrations/nextcloud/files/content?path=${
          encodeURIComponent(entry.path)
        }`
      );
      if (!response.ok) throw new Error(await responseError(response));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = entry.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      showToast('Download fehlgeschlagen', error.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const deleteEntry = async entry => {
    if (deleteConfirm !== entry.path) {
      setDeleteConfirm(entry.path);
      return;
    }
    setBusy(`delete:${entry.path}`);
    try {
      await plannerApiRequest(
        `/api/integrations/nextcloud/files/entry?path=${
          encodeURIComponent(entry.path)
        }`,
        { method: 'DELETE' }
      );
      setDeleteConfirm('');
      setPreview(null);
      await load(path, { silent: true });
      showToast(
        'Aus der Cloud entfernt',
        `${entry.name} wurde gelöscht.`,
        'info'
      );
    } catch (error) {
      showToast('Löschen fehlgeschlagen', error.message, 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="cloud-file-browser">
      <header className="cloud-file-heading">
        <div>
          <span className="cloud-file-kicker">
            <ImageIcon size={15} /> Dateien direkt in LX
          </span>
          <h2>Unser Familienarchiv</h2>
          <p>
            Fotos, Dokumente und gemeinsame Erinnerungen – ohne die App zu
            verlassen.
          </p>
        </div>
        <div className="cloud-file-heading-actions">
          {storage && (
            <div className="cloud-storage-meter">
              <span>
                <strong>{fileSize(storage.used)}</strong>
                {' von '}
                {storage.total
                  ? fileSize(storage.total)
                  : 'unbegrenzt'}
              </span>
              <i>
                <b
                  style={{
                    width: `${Math.max(
                      1,
                      Math.min(100, Number(storage.relative || 0))
                    )}%`
                  }}
                />
              </i>
            </div>
          )}
          <button
            type="button"
            onClick={() => setNewFolderOpen(value => !value)}
          >
            <FolderPlus size={16} /> Neuer Ordner
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={Boolean(busy)}
          >
            {busy === 'upload'
              ? <LoaderCircle className="spin" size={16} />
              : <Upload size={16} />}
            Hochladen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={event => {
              uploadFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>
      </header>

      <nav className="cloud-file-breadcrumbs" aria-label="Cloud-Pfad">
        {path && (
          <button
            type="button"
            className="cloud-file-back"
            onClick={() => {
              const parent = path.split('/').slice(0, -1).join('/');
              load(parent);
            }}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={`${crumb.path}-${index}`}>
            {index > 0 && <span>/</span>}
            <button type="button" onClick={() => load(crumb.path)}>
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
        <button
          type="button"
          className="cloud-file-refresh"
          onClick={() => load(path)}
          title="Ordner aktualisieren"
        >
          <RefreshCw className={loading ? 'spin' : ''} size={15} />
        </button>
      </nav>

      {newFolderOpen && (
        <form className="cloud-new-folder" onSubmit={createFolder}>
          <FolderPlus size={18} />
          <input
            value={newFolderName}
            onChange={event => setNewFolderName(event.target.value)}
            placeholder="Name des neuen Ordners"
            maxLength={120}
            autoFocus
          />
          <button disabled={!newFolderName.trim() || Boolean(busy)}>
            Anlegen
          </button>
          <button type="button" onClick={() => setNewFolderOpen(false)}>
            <X size={16} />
          </button>
        </form>
      )}

      <div
        className={`cloud-drop-zone ${dragging ? 'dragging' : ''}`}
        onDragEnter={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragging(false);
          }
        }}
        onDrop={event => {
          event.preventDefault();
          uploadFiles(event.dataTransfer.files);
        }}
      >
        {dragging && (
          <div className="cloud-drop-message">
            <CloudUpload size={34} />
            <strong>Hier loslassen</strong>
            <span>Die Dateien landen in diesem Ordner.</span>
          </div>
        )}

        {loading ? (
          <div className="cloud-file-loading">
            <LoaderCircle className="spin" size={27} />
            Familienordner wird geöffnet …
          </div>
        ) : entries.length ? (
          <div className="cloud-entry-grid">
            {entries.map(entry => {
              const Icon = entryIcon(entry);
              const working = busy.endsWith(entry.path);
              return (
                <article
                  key={entry.path}
                  className={`cloud-entry-card ${entry.type}`}
                >
                  <button
                    type="button"
                    className="cloud-entry-open"
                    onClick={() => openPreview(entry)}
                  >
                    <span><Icon size={28} /></span>
                    <strong>{entry.name}</strong>
                    <small>
                      {entry.type === 'folder'
                        ? 'Ordner öffnen'
                        : `${fileSize(entry.size)} · ${fileDate(entry.modifiedAt)}`}
                    </small>
                  </button>
                  <div>
                    {entry.type === 'file' && (
                      <button
                        type="button"
                        onClick={() => openPreview(entry)}
                        title="Vorschau"
                        disabled={working}
                      >
                        <Maximize2 size={15} />
                      </button>
                    )}
                    {entry.type === 'file' && (
                      <button
                        type="button"
                        onClick={() => downloadEntry(entry)}
                        title="Herunterladen"
                        disabled={working}
                      >
                        <Download size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      className={
                        deleteConfirm === entry.path ? 'confirm-delete' : ''
                      }
                      onClick={() => deleteEntry(entry)}
                      title={
                        deleteConfirm === entry.path
                          ? 'Noch einmal klicken'
                          : 'Entfernen'
                      }
                      disabled={working}
                    >
                      {working
                        ? <LoaderCircle className="spin" size={15} />
                        : <Trash2 size={15} />}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <button
            type="button"
            className="cloud-file-empty"
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload size={39} />
            <strong>Noch Platz für eure Erinnerungen</strong>
            <span>
              Dateien hierher ziehen oder antippen und auswählen.
            </span>
          </button>
        )}
      </div>

      {preview && (
        <div
          className="cloud-preview-layer"
          onClick={() => setPreview(null)}
        >
          <section
            className="cloud-preview-dialog"
            onClick={event => event.stopPropagation()}
          >
            <header>
              <div>
                <small>Cloud-Vorschau</small>
                <h2>{preview.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Vorschau schließen"
              >
                <X size={18} />
              </button>
            </header>
            <div className="cloud-preview-stage">
              {busy === `preview:${preview.path}` ? (
                <LoaderCircle className="spin" size={30} />
              ) : preview.mimeType?.startsWith('image/') && previewUrl ? (
                <img src={previewUrl} alt={preview.name} />
              ) : preview.mimeType === 'application/pdf' && previewUrl ? (
                <iframe src={previewUrl} title={preview.name} />
              ) : preview.mimeType?.startsWith('text/') ? (
                <pre>{previewText}</pre>
              ) : (
                <div className="cloud-preview-generic">
                  <File size={45} />
                  <strong>Keine direkte Vorschau verfügbar</strong>
                  <span>{preview.mimeType}</span>
                </div>
              )}
            </div>
            <footer>
              <span>
                {fileSize(preview.size)} · {fileDate(preview.modifiedAt)}
              </span>
              <button type="button" onClick={() => downloadEntry(preview)}>
                <Download size={16} /> Herunterladen
              </button>
              <button
                type="button"
                className={
                  deleteConfirm === preview.path ? 'confirm-delete' : ''
                }
                onClick={() => deleteEntry(preview)}
              >
                <Trash2 size={16} />
                {deleteConfirm === preview.path
                  ? 'Löschen bestätigen'
                  : 'Löschen'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
