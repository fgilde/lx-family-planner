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
import { Trans, useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import {
  plannerApiFetch,
  plannerApiRequest
} from '../../utils/apiConfig';
import {
  compareStrings,
  formatDateTime,
  toLocaleLowerCase
} from '../../utils/formatting';

const FILE_LIMIT_BYTES = 100 * 1024 * 1024;

function fileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function fileDate(value, t) {
  if (!value) return t('fileBrowser.noDateYet');
  return formatDateTime(value, {
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

async function responseError(response, t) {
  try {
    const data = await response.json();
    return data?.error || t('fileBrowser.loadFileError');
  } catch {
    return t('fileBrowser.loadFileError');
  }
}

export default function CloudFileBrowser() {
  const { t } = useTranslation('adminCloud');
  const { setActiveTab, showToast } = useFamily();
  const [path, setPath] = useState('');
  const [folderName, setFolderName] = useState(t('fileBrowser.familyFolder'));
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
      setFolderName(data.folder || t('fileBrowser.familyFolder'));
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
    const query = toLocaleLowerCase(searchQuery.trim());
    return entries
      .filter(entry =>
        !query ||
        toLocaleLowerCase(entry.name).includes(query)
      )
      .sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === 'folder' ? -1 : 1;
        }
        return compareStrings(left.name, right.name);
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
    if (!path) {
      showToast(
        t('fileBrowser.openFolderFirstTitle'),
        t('fileBrowser.openFolderFirstBody'),
        'info'
      );
      return;
    }
    const oversized = files.find(file => file.size > FILE_LIMIT_BYTES);
    if (oversized) {
      showToast(
        t('fileBrowser.fileTooLargeTitle'),
        t('fileBrowser.fileTooLargeBody', { name: oversized.name }),
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
          t('fileBrowser.fileNotUploaded', { name: file.name }),
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
        t('fileBrowser.uploadedTitle', { count: uploaded }),
        t('fileBrowser.uploadedBody', { count: uploaded }),
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
        t('fileBrowser.folderCreatedTitle'),
        t('fileBrowser.folderCreatedBody'),
        'success'
      );
    } catch (error) {
      showToast(t('fileBrowser.folderNotCreated'), error.message, 'error');
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
      if (!response.ok) throw new Error(await responseError(response, t));
      const blob = await response.blob();
      if (entry.mimeType?.startsWith('text/')) {
        setPreviewText((await blob.text()).slice(0, 200_000));
      } else {
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      setPreview(null);
      showToast(t('fileBrowser.previewUnavailable'), error.message, 'error');
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
      if (!response.ok) throw new Error(await responseError(response, t));
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
      showToast(t('fileBrowser.downloadFailed'), error.message, 'error');
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
        t('fileBrowser.deletedTitle'),
        t('fileBrowser.deletedBody', { name: entry.name }),
        'info'
      );
    } catch (error) {
      showToast(t('fileBrowser.deleteFailed'), error.message, 'error');
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
            <span className="cloud-file-kicker">{t('fileBrowser.kicker')}</span>
            <h1>{t('fileBrowser.title')}</h1>
            <p>{t('fileBrowser.intro')}</p>
          </div>
        </div>
        <div className="cloud-file-heading-actions">
          {storage && (
            <div className="cloud-storage-meter">
              <span>
                <Trans
                  t={t}
                  i18nKey="fileBrowser.storageUsage"
                  values={{
                    used: fileSize(storage.used),
                    total: storage.total
                      ? fileSize(storage.total)
                      : t('fileBrowser.unlimited')
                  }}
                  components={{ strong: <strong /> }}
                />
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
            <FolderPlus size={16} /> {t('fileBrowser.newFolder')}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (!path) {
                showToast(
                  t('fileBrowser.chooseTargetTitle'),
                  t('fileBrowser.chooseTargetUpload'),
                  'info'
                );
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={Boolean(busy)}
          >
            {busy === 'upload'
              ? <LoaderCircle className="spin" size={16} />
              : <Upload size={16} />}
            {t('fileBrowser.upload')}
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
        <nav className="cloud-file-breadcrumbs" aria-label={t('fileBrowser.breadcrumbsLabel')}>
          {path && (
            <button
              type="button"
              className="cloud-file-back"
              onClick={() => {
                const parent = path.split('/').slice(0, -1).join('/');
                load(parent);
              }}
              aria-label={t('fileBrowser.upOneLevel')}
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
            placeholder={t('fileBrowser.searchPlaceholder')}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={t('fileBrowser.clearSearch')}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <div className="cloud-view-switch" aria-label={t('fileBrowser.viewSwitchLabel')}>
          <button
            type="button"
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => changeViewMode('grid')}
            title={t('fileBrowser.gridView')}
          >
            <Grid2X2 size={15} />
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => changeViewMode('list')}
            title={t('fileBrowser.listView')}
          >
            <List size={16} />
          </button>
        </div>
        <button
          type="button"
          className="cloud-file-refresh"
          onClick={() => load(path)}
          title={t('fileBrowser.refreshFolder')}
        >
          <RefreshCw className={loading ? 'spin' : ''} size={15} />
        </button>
      </div>

      <div className="cloud-file-location">
        <span>
          <FolderOpen size={16} />
          {path ? path.split('/').at(-1) : t('fileBrowser.allContents')}
        </span>
        <small>
          {t('fileBrowser.folderCount', { count: folderCount })} ·{' '}
          {t('fileBrowser.fileCount', { count: fileCount })}
        </small>
      </div>

      {newFolderOpen && (
        <form className="cloud-new-folder" onSubmit={createFolder}>
          <FolderPlus size={18} />
          <input
            value={newFolderName}
            onChange={event => setNewFolderName(event.target.value)}
            placeholder={t('fileBrowser.newFolderPlaceholder')}
            maxLength={120}
            autoFocus
          />
          <button disabled={!newFolderName.trim() || Boolean(busy)}>
            {t('fileBrowser.create')}
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
          if (!path) {
            setDragging(false);
            showToast(
              t('fileBrowser.chooseTargetTitle'),
              t('fileBrowser.chooseTargetDrop'),
              'info'
            );
            return;
          }
          uploadFiles(event.dataTransfer.files);
        }}
      >
        {dragging && (
          <div className="cloud-drop-message">
            <CloudUpload size={34} />
            <strong>{t('fileBrowser.dropHereTitle')}</strong>
            <span>{t('fileBrowser.dropHereBody')}</span>
          </div>
        )}

        {loading ? (
          <div className="cloud-file-loading">
            <LoaderCircle className="spin" size={27} />
            {t('fileBrowser.loading')}
          </div>
        ) : loadError ? (
          <div className="cloud-file-error">
            <span><ShieldCheck size={25} /></span>
            <strong>{t('fileBrowser.errorTitle')}</strong>
            <p>{loadError}</p>
            <button type="button" onClick={() => setActiveTab('admin')}>
              {t('fileBrowser.checkInAdmin')}
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
                          ? t('fileBrowser.openCollection')
                          : `${fileSize(entry.size)} · ${fileDate(entry.modifiedAt, t)}`}
                      </small>
                    </span>
                  </button>
                  <div>
                    {entry.type === 'file' && (
                      <button
                        type="button"
                        onClick={() => openPreview(entry)}
                        title={t('fileBrowser.preview')}
                        disabled={working}
                      >
                        <Maximize2 size={15} />
                      </button>
                    )}
                    {entry.type === 'file' && (
                      <button
                        type="button"
                        onClick={() => downloadEntry(entry)}
                        title={t('fileBrowser.download')}
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
                          ? t('fileBrowser.clickAgain')
                          : t('fileBrowser.remove')
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
            <strong>{t('fileBrowser.noResults', { query: searchQuery })}</strong>
            <button type="button" onClick={() => setSearchQuery('')}>
              {t('fileBrowser.showAll')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="cloud-file-empty"
            onClick={() => {
              if (path) {
                fileInputRef.current?.click();
              } else {
                setNewFolderOpen(true);
              }
            }}
          >
            <CloudUpload size={39} />
            <strong>{t('fileBrowser.emptyTitle')}</strong>
            <span>{t('fileBrowser.emptyBody')}</span>
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
                <small>{t('fileBrowser.previewKicker')}</small>
                <h2>{preview.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label={t('fileBrowser.closePreview')}
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
                  <strong>{t('fileBrowser.noPreview')}</strong>
                  <span>{preview.mimeType}</span>
                </div>
              )}
            </div>
            <footer>
              <span>
                {fileSize(preview.size)} · {fileDate(preview.modifiedAt, t)}
              </span>
              <button type="button" onClick={() => downloadEntry(preview)}>
                <Download size={16} /> {t('fileBrowser.download')}
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
                  ? t('fileBrowser.confirmDelete')
                  : t('common:actions.delete')}
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
