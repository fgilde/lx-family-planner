import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Cloud,
  FileImage,
  Folder,
  LoaderCircle,
  Upload
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import { plannerApiRequest } from '../../utils/apiConfig';
import CloudUploadDestinationDialog
  from '../Admin/CloudUploadDestinationDialog';

const FILE_LIMIT_BYTES = 100 * 1024 * 1024;

function fileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

export default function FamilyCloudWidget() {
  const {
    nextcloudIntegration,
    webdavIntegration,
    setActiveTab,
    showToast
  } = useFamily();
  const { t } = useTranslation('widgets');
  const [summary, setSummary] = useState({
    entries: [],
    storage: null
  });
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileInputRef = useRef(null);
  const connected = Boolean(webdavIntegration?.connected || nextcloudIntegration?.connected);

  const loadSummary = async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const data = await plannerApiRequest(
        '/api/integrations/family-cloud/files?path='
      );
      setSummary({
        entries: data.entries || [],
        storage: data.storage || null
      });
    } catch {
      setSummary({ entries: [], storage: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, [connected, nextcloudIntegration?.updatedAt, webdavIntegration?.updatedAt]);

  const prepareUpload = fileList => {
    const files = [...(fileList || [])].slice(0, 10);
    if (!files.length) return;
    const oversized = files.find(file => file.size > FILE_LIMIT_BYTES);
    if (oversized) {
      showToast(
        t('familyCloud.toast.fileTooBigTitle'),
        t('familyCloud.toast.fileTooBigMessage', { name: oversized.name }),
        'warning'
      );
      return;
    }
    setPendingFiles(files);
  };

  const recentEntries = [...summary.entries]
    .sort((left, right) => {
      if (left.type !== right.type) return left.type === 'folder' ? -1 : 1;
      return (
        (Date.parse(right.modifiedAt || '') || 0) -
        (Date.parse(left.modifiedAt || '') || 0)
      );
    })
    .slice(0, 3);
  const storage = summary.storage;
  const storagePercent = Math.max(
    0,
    Math.min(100, Number(storage?.relative || 0))
  );

  return (
    <>
      <div className="adult-widget-header">
        <div
          className="adult-widget-heading"
          style={{ color: '#177f7b' }}
        >
          <span className="adult-widget-heading-icon" aria-hidden="true">
            <Cloud size={20} />
          </span>
          <h3><span>{t('familyCloud.title')}</span></h3>
        </div>
        <button
          type="button"
          className="adult-widget-link"
          onClick={() => setActiveTab('cloud')}
          aria-label={t('familyCloud.openAria')}
        >
          {t('familyCloud.open')} <ArrowRight size={13} />
        </button>
      </div>

      {!connected ? (
        <div className="adult-cloud-unavailable">
          <Cloud size={31} />
          <strong>{t('familyCloud.preparing')}</strong>
          <p>{t('familyCloud.checkConnection')}</p>
          <button type="button" onClick={() => setActiveTab('admin')}>
            {t('familyCloud.toParentCenter')}
          </button>
        </div>
      ) : (
        <div className="adult-cloud-content">
          <div className="adult-cloud-storage">
            <span>
              <small>{t('familyCloud.sharedStorage')}</small>
              <strong>
                {storage ? fileSize(storage.used) : t('familyCloud.loading')}
              </strong>
              <em>
                {storage?.total
                  ? t('familyCloud.ofTotal', { size: fileSize(storage.total) })
                  : t('familyCloud.safeForFamily')}
              </em>
            </span>
            <i>
              <b style={{ width: `${storagePercent}%` }} />
            </i>
          </div>

          <div className="adult-cloud-recent">
            {loading ? (
              <span className="adult-cloud-loading">
                <LoaderCircle className="spin" size={18} />
                {t('familyCloud.openingArchive')}
              </span>
            ) : recentEntries.length ? (
              recentEntries.map(entry => (
                <button
                  type="button"
                  key={entry.path}
                  onClick={() => setActiveTab('cloud')}
                >
                  <span>
                    {entry.type === 'folder'
                      ? <Folder size={18} />
                      : <FileImage size={18} />}
                  </span>
                  <strong>{entry.name}</strong>
                </button>
              ))
            ) : (
              <span className="adult-cloud-loading">
                {t('familyCloud.noFiles')}
              </span>
            )}
          </div>

          <button
            type="button"
            className="adult-cloud-upload"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={17} />
            {t('familyCloud.upload')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={event => {
              prepareUpload(event.target.files);
              event.target.value = '';
            }}
          />
        </div>
      )}
      {pendingFiles.length > 0 && (
        <CloudUploadDestinationDialog
          files={pendingFiles}
          showToast={showToast}
          onClose={() => setPendingFiles([])}
          onUploaded={async () => {
            setPendingFiles([]);
            await loadSummary();
          }}
        />
      )}
    </>
  );
}
