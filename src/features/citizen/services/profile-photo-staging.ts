type CommittedPhoto = { tmpPath: string; reference: string };
export type ProfilePhotoCommitCache = {
  userId?: string;
  avatar?: CommittedPhoto;
  identity?: CommittedPhoto;
};

type PhotoCommit = () => Promise<{ publicUrl: string }>;

// Keep moved objects available for retry until the existing profile PATCH succeeds.
// Moving an object is not confirmation that its PostgreSQL reference was saved.
export async function prepareProfilePhotoReferences({
  userId, avatarTmpPath, identityTmpPath, commitAvatar, commitIdentity, cache,
}: {
  userId: string;
  avatarTmpPath: string | null;
  identityTmpPath: string | null;
  commitAvatar: PhotoCommit;
  commitIdentity: PhotoCommit;
  cache: ProfilePhotoCommitCache;
}): Promise<{ avatarUrl?: string; profilePhotoUrl?: string }> {
  if (cache.userId !== userId) {
    delete cache.avatar;
    delete cache.identity;
    cache.userId = userId;
  }
  for (const [kind, tmpPath, commit] of [
    ["identity", identityTmpPath, commitIdentity],
    ["avatar", avatarTmpPath, commitAvatar],
  ] as const) {
    if (!tmpPath || cache[kind]?.tmpPath === tmpPath) continue;
    // A replacement must not fall back to a previously prepared image on error.
    delete cache[kind];
    const { publicUrl } = await commit();
    if (!publicUrl) throw new Error("No pudimos confirmar la referencia de la fotografía.");
    cache[kind] = { tmpPath, reference: publicUrl };
  }
  return {
    ...(cache.avatar ? { avatarUrl: cache.avatar.reference } : {}),
    ...(cache.identity ? { profilePhotoUrl: cache.identity.reference } : {}),
  };
}
