import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CloudUpload,
  Folder,
  FolderPlus,
  LoaderCircle,
  Upload,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import {
  describeApiError,
  plannerApiRequest
} from '../../utils/apiConfig';

const FILE_LIMIT_BYTES = 100 * 1024 * 1024;
const LAST_FOLDER_KEY = 'lx_cloud_upload_folder';

function folderDepth(path) {
  return Math.max(0, String(path || '').split('/').filter(Boolean).length - 1);
}

function folderArea(path) {
  return String(path || '').startsWith('Profile/')
    ? 'profile'
    : 'family';
}

export default function CloudUploadDestinationDialog({
  files,
  onClose,
  onUploaded,
  showToast
}) {
  const { t } = useTranslation('adminCloud');
  const [folders, setFolders] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [area, setArea] = useState('family');
  const [progress, setProgress] = useState('');

  const loadFolders = async preferredPath => {
    setLoading(true);
    try {
      const data = await plannerApiRequest(
        '/api/integrations/family-cloud/folders'
      );
      const loaded = (data.folders || []).filter(folder => folder.path);
      setFolders(loaded);
      let stored = '';
      try {
        stored = localStorage.getItem(LAST_FOLDER_KEY) || '';
      } catch {
        stored = '';
      }
      const candidates = [
        preferredPath,
        stored,
        'Familie/Uploads',
        'Familie'
      ].filter(Boolean);
      const nextSelection = candidates.find(candidate =>
        loaded.some(folder => folder.path === candidate)
      ) || loaded[0]?.path || '';
      setSelectedPath(nextSelection);
      setArea(folderArea(nextSelection));
    } catch (error) {
      showToast(
        t('uploadDestination.foldersNotLoaded'),
        describeApiError(error),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFolders();
  }, []);

  const visibleFolders = useMemo(
    () => folders.filter(folder =>
      area === 'profile'
        ? folder.path.startsWith('Profile/')
        : folder.path === 'Familie' || folder.path.startsWith('Familie/')
    ),
    [area, folders]
  );

  const createFolder = async event => {
    event.preventDefault();
    if (!newFolderName.trim() || !selectedPath || creating) return;
    setCreating(true);
    try {
      const data = await plannerApiRequest(
        '/api/integrations/family-cloud/files/folder',
        {
          method: 'POST',
          body: JSON.stringify({
            path: selectedPath,
            name: newFolderName.trim()
          })
        }
      );
      setNewFolderName('');
      await loadFolders(data.entry.path);
      showToast(
        t('uploadDestination.folderCreatedTitle'),
        t('uploadDestination.folderCreatedBody', { name: data.entry.name }),
        'success'
      );
    } catch (error) {
      showToast(
        t('uploadDestination.folderNotCreated'),
        describeApiError(error),
        'error'
      );
    } finally {
      setCreating(false);
    }
  };

  const upload = async () => {
    if (!selectedPath || uploading) return;
    const oversized = files.find(file => file.size > FILE_LIMIT_BYTES);
    if (oversized) {
      showToast(
        t('uploadDestination.fileTooLargeTitle'),
        t('uploadDestination.fileTooLargeBody', { name: oversized.name }),
        'warning'
      );
      return;
    }
    setUploading(true);
    let uploaded = 0;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setProgress(t('uploadDestination.progress', {
        current: index + 1,
        total: files.length,
        name: file.name
      }));
      try {
        await plannerApiRequest(
          `/api/integrations/family-cloud/files/file?path=${
            encodeURIComponent(selectedPath)
          }`,
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
          t('uploadDestination.fileNotUploaded', { name: file.name }),
          describeApiError(error),
          'error'
        );
      }
    }
    try {
      localStorage.setItem(LAST_FOLDER_KEY, selectedPath);
    } catch {
      // Die Ordnerwahl muss nicht dauerhaft gespeichert werden.
    }
    setUploading(false);
    setProgress('');
    if (uploaded) {
      showToast(
        t('uploadDestination.uploadedTitle', { count: uploaded }),
        t('uploadDestination.uploadedBody', {
          count: uploaded,
          path: selectedPath
        }),
        'success'
      );
      onUploaded?.(selectedPath);
    }
  };

  return (
    <div
      className="cloud-upload-layer"
      role="presentation"
      onClick={uploading ? undefined : onClose}
    >
      <section
        className="cloud-upload-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-upload-title"
        onClick={event => event.stopPropagation()}
      >
        <header>
          <span><CloudUpload size={22} /></span>
          <div>
            <small>{t('uploadDestination.filesReady', { count: files.length })}</small>
            <h2 id="cloud-upload-title">{t('uploadDestination.title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            aria-label={t('uploadDestination.closeDialog')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="cloud-upload-area-switch">
          <button
            type="button"
            className={area === 'family' ? 'active' : ''}
            onClick={() => setArea('family')}
          >
            <UsersRound size={16} />
            {t('uploadDestination.familyFolders')}
          </button>
          <button
            type="button"
            className={area === 'profile' ? 'active' : ''}
            onClick={() => setArea('profile')}
          >
            <UserRound size={16} />
            {t('uploadDestination.profileFolders')}
          </button>
        </div>

        <div className="cloud-upload-folder-list">
          {loading ? (
            <span className="cloud-upload-loading">
              <LoaderCircle className="spin" size={20} />
              {t('uploadDestination.loadingFolders')}
            </span>
          ) : visibleFolders.length ? (
            visibleFolders.map(folder => (
              <button
                type="button"
                key={folder.path}
                className={selectedPath === folder.path ? 'active' : ''}
                style={{
                  '--folder-level': Math.min(
                    4,
                    folder.depth ?? folderDepth(folder.path)
                  )
                }}
                onClick={() => setSelectedPath(folder.path)}
              >
                <Folder size={17} />
                <span>
                  <strong>{folder.name}</strong>
                  <small>{folder.path}</small>
                </span>
                {selectedPath === folder.path && <Check size={16} />}
              </button>
            ))
          ) : (
            <span className="cloud-upload-loading">
              {t('uploadDestination.noFolders')}
            </span>
          )}
        </div>

        <form className="cloud-upload-new-folder" onSubmit={createFolder}>
          <FolderPlus size={17} />
          <input
            value={newFolderName}
            onChange={event => setNewFolderName(event.target.value)}
            placeholder={
              selectedPath
                ? t('uploadDestination.newFolderIn', {
                    folder: selectedPath.split('/').at(-1)
                  })
                : t('uploadDestination.chooseAreaFirst')
            }
            maxLength={120}
            disabled={!selectedPath || uploading}
          />
          <button
            type="submit"
            disabled={
              !selectedPath ||
              !newFolderName.trim() ||
              creating ||
              uploading
            }
          >
            {creating
              ? <LoaderCircle className="spin" size={15} />
              : <FolderPlus size={15} />}
            {t('uploadDestination.create')}
          </button>
        </form>

        {progress && (
          <div className="cloud-upload-progress">
            <LoaderCircle className="spin" size={16} />
            <span>{progress}</span>
          </div>
        )}

        <footer>
          <span>
            {selectedPath
              ? (
                <Trans
                  t={t}
                  i18nKey="uploadDestination.target"
                  values={{ path: selectedPath }}
                  components={{ strong: <strong /> }}
                />
              )
              : t('uploadDestination.chooseFolder')}
          </span>
          <button
            type="button"
            className="primary"
            onClick={upload}
            disabled={!selectedPath || uploading || loading}
          >
            {uploading
              ? <LoaderCircle className="spin" size={17} />
              : <Upload size={17} />}
            {uploading ? t('uploadDestination.uploading') : t('uploadDestination.uploadHere')}
          </button>
        </footer>
      </section>
    </div>
  );
}
