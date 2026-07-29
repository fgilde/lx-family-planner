import React, { useEffect, useState } from 'react';

export default function MediaCover({
  link,
  className = '',
  fallback = null
}) {
  const [failed, setFailed] = useState(false);
  const coverUrl = link?.coverUrl || '';

  useEffect(() => {
    setFailed(false);
  }, [coverUrl]);

  if (!coverUrl || failed) return fallback;

  return (
    <img
      className={className}
      src={coverUrl}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
