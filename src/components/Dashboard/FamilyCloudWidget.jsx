import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Cloud,
  FileImage,
  Folder,
  LoaderCircle,
  Upload
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { plannerApiRequest } from '../../utils/apiConfig';

const FILE_LIMIT_BYTES = 25 * 1024 * 1024;

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
    setActiveTab,
    showToast
  } = useFamily();
  const [summary, setSummary] = useState({
    entries: [],
    storage: null
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const connected = Boolean(nextcloudIntegration?.connected);

  const loadSummary = async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const data = await plannerApiRequest(
        '/api/integrations/nextcloud/files?path='
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
  }, [connected, nextcloudIntegration?.updatedAt]);

  const uploadFiles = async fileList => {
    const files = [...(fileList || [])].slice(0, 10);
    if (!files.length || uploading) return;
    const oversized = files.find(file => file.size > FILE_LIMIT_BYTES);
    if (oversized) {
      showToast(
        'Datei zu groß',
        `${oversized.name} ist größer als 25 MB.`,
        'warning'
      );
      return;
    }
    setUploading(true);
    let uploaded = 0;
    for (const file of files) {
      try {
        await plannerApiRequest(
          '/api/integrations/nextcloud/files/file?path=',
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
    setUploading(false);
    if (uploaded) {
      await loadSummary();
      showToast(
        uploaded === 1 ? 'Im Familienarchiv gespeichert' : 'Upload fertig',
        `${uploaded} Datei${uploaded === 1 ? '' : 'en'} erfolgreich hochgeladen.`,
        'success'
      );
    }
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
          <h3><span>Familienarchiv</span></h3>
        </div>
        <button
          type="button"
          className="adult-widget-link"
          onClick={() => setActiveTab('cloud')}
          aria-label="Familienarchiv öffnen"
        >
          Öffnen <ArrowRight size={13} />
        </button>
      </div>

      {!connected ? (
        <div className="adult-cloud-unavailable">
          <Cloud size={31} />
          <strong>Das Archiv wird vorbereitet</strong>
          <p>Die Verbindung lässt sich in der Elternzentrale prüfen.</p>
          <button type="button" onClick={() => setActiveTab('admin')}>
            Zur Elternzentrale
          </button>
        </div>
      ) : (
        <div className="adult-cloud-content">
          <div className="adult-cloud-storage">
            <span>
              <small>Gemeinsamer Speicher</small>
              <strong>
                {storage ? fileSize(storage.used) : 'Wird geladen'}
              </strong>
              <em>
                {storage?.total
                  ? `von ${fileSize(storage.total)}`
                  : 'sicher für eure Familie'}
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
                Archiv wird geöffnet …
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
                Noch keine Dateien – hier ist Platz für eure Erinnerungen.
              </span>
            )}
          </div>

          <button
            type="button"
            className="adult-cloud-upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <LoaderCircle className="spin" size={17} />
              : <Upload size={17} />}
            {uploading ? 'Wird hochgeladen …' : 'In die Cloud hochladen'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={event => {
              void uploadFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>
      )}
    </>
  );
}
