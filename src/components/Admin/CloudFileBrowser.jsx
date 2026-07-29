import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CloudUpload,
  Download,
  File,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Grid2X2,
  Image as ImageIcon,
  List,
  LoaderCircle,
  Maximize2,
  RefreshCw,
  Search,
  ShieldCheck,
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
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
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

function CloudImageThumbnail({ entry }) {
  const [source, setSource] = useState('');
  const [shouldLoad, setShouldLoad] = useState(false);
  const thumbnailRef = useRef(null);

  useEffect(() => {
    const element = thumbnailRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      observations => {
        if (observations.some(observation => observation.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '180px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      !shouldLoad ||
      !entry.mimeType?.startsWith('image/') ||
      Number(entry.size || 0) > 12 * 1024 * 1024
    ) {
      return undefined;
    }
    let active = true;
    let objectUrl = '';
    const loadThumbnail = async () => {
      try {
        const response = await plannerApiFetch(
          `/api/integrations/nextcloud/files/content?inline=true&path=${
            encodeURIComponent(entry.path)
          }`
        );
        if (!response.ok || !active) return;
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setSource(objectUrl);
      } catch {
        // Das Dateisymbol bleibt als ruhiger Fallback sichtbar.
      }
    };
    void loadThumbnail();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [entry.mimeType, entry.path, entry.size, shouldLoad]);

  return (
    <i ref={thumbnailRef} className="cloud-image-thumb">
      {source
        ? <img src={source} alt="" loading="lazy" />
        : <FileImage size={30} />}
    </i>
  );
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
  const { setActiveTab, showToast } = useFamily();
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
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('lx_cloud_view') === 'list'
        ? 'list'
        : 'grid';
    } catch {
      return 'grid';
    }
  });
  const fileInputRef = useRef(null);

  const load = async (nextPath = path, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      setLoadError('');
      const data = await plannerApiRequest(
        `/api/integrations/nextcloud/files?path=${encodeURIComponent(
          nextPath
        )}`
      );
      const loadedPath = data.path || '';
      if (loadedPath !== path) setSearchQuery('');
      setPath(loadedPath);
      setFolderName(data.folder || 'Familienordner');
      setEntries(data.entries || []);
      setStorage(data.storage || null);
    } catch (error) {
      setLoadError(error.message);
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

  const visibleEntries = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('de-DE');
    return entries
      .filter(entry =>
        !query ||
        entry.name.toLocaleLowerCase('de-DE').includes(query)
      )
      .sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === 'folder' ? -1 : 1;
        }
        return left.name.localeCompare(right.name, 'de-DE', {
          sensitivity: 'base'
        });
      });
  }, [entries, searchQuery]);

  const folderCount = entries.filter(entry => entry.type === 'folder').length;
  const fileCount = entries.length - folderCount;

  const changeViewMode = nextMode => {
    setViewMode(nextMode);
    try {
      localStorage.setItem('lx_cloud_view', nextMode);
    } catch {
      // Die Auswahl bleibt zumindest für die aktuelle Sitzung erhalten.
    }
  };

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
        'Der neue Bereich ist sofort im Familienarchiv verfügbar.',
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
        'Aus dem Archiv entfernt',
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
        <div className="cloud-file-title">
          <span className="cloud-file-title-mark" aria-hidden="true">
            <ImageIcon size={25} />
          </span>
          <div>
            <span className="cloud-file-kicker">Dateien direkt in LX</span>
            <h1>Unser Familienarchiv</h1>
            <p>
              Fotos, Dokumente und gemeinsame Erinnerungen – sicher an einem
              Ort für eure Familie.
            </p>
          </div>
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

      <div className="cloud-file-toolbar">
        <nav className="cloud-file-breadcrumbs" aria-label="Archivpfad">
          {path && (
            <button
              type="button"
              className="cloud-file-back"
              onClick={() => {
                const parent = path.split('/').slice(0, -1).join('/');
                load(parent);
              }}
              aria-label="Eine Ebene zurück"
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
        </nav>
        <label className="cloud-file-search">
          <Search size={15} />
          <input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="In diesem Ordner suchen"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Suche leeren"
            >
              <X size={14} />
            </button>
          )}
        </label>
        <div className="cloud-view-switch" aria-label="Ansicht wählen">
          <button
            type="button"
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => changeViewMode('grid')}
            title="Galerieansicht"
          >
            <Grid2X2 size={15} />
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => changeViewMode('list')}
            title="Listenansicht"
          >
            <List size={16} />
          </button>
        </div>
        <button
          type="button"
          className="cloud-file-refresh"
          onClick={() => load(path)}
          title="Ordner aktualisieren"
        >
          <RefreshCw className={loading ? 'spin' : ''} size={15} />
        </button>
      </div>

      <div className="cloud-file-location">
        <span>
          <FolderOpen size={16} />
          {path ? path.split('/').at(-1) : 'Alle Inhalte'}
        </span>
        <small>
          {folderCount} Ordner · {fileCount}{' '}
          {fileCount === 1 ? 'Datei' : 'Dateien'}
        </small>
      </div>

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
        ) : loadError ? (
          <div className="cloud-file-error">
            <span><ShieldCheck size={25} /></span>
            <strong>Das Familienarchiv wird noch vorbereitet</strong>
            <p>{loadError}</p>
            <button type="button" onClick={() => setActiveTab('admin')}>
              In der Elternzentrale prüfen
            </button>
          </div>
        ) : visibleEntries.length ? (
          <div className={`cloud-entry-grid view-${viewMode}`}>
            {visibleEntries.map(entry => {
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
                    <span className="cloud-entry-art">
                      {entry.mimeType?.startsWith('image/')
                        ? <CloudImageThumbnail entry={entry} />
                        : <Icon size={30} />}
                    </span>
                    <span className="cloud-entry-copy">
                      <strong>{entry.name}</strong>
                      <small>
                        {entry.type === 'folder'
                          ? 'Sammlung öffnen'
                          : `${fileSize(entry.size)} · ${fileDate(entry.modifiedAt)}`}
                      </small>
                    </span>
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
        ) : searchQuery ? (
          <div className="cloud-file-no-results">
            <Search size={28} />
            <strong>Nichts mit „{searchQuery}“ gefunden</strong>
            <button type="button" onClick={() => setSearchQuery('')}>
              Alle Inhalte zeigen
            </button>
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
                <small>Vorschau im Familienarchiv</small>
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
