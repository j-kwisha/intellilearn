import { useState } from 'react';

export default function ProfileAvatar({ user, src = user?.avatar }) {
  const [failedSrc, setFailedSrc] = useState(null);
  return src && failedSrc !== src
    ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    : <>{user?.first_name?.[0]}{user?.last_name?.[0]}</>;
}
