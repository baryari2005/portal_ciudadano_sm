import assert from "node:assert/strict";
import { prepareProfilePhotoReferences, type ProfilePhotoCommitCache } from "../src/features/citizen/services/profile-photo-staging";

async function main() {
  const cache: ProfilePhotoCommitCache = {};
  let avatarCommits = 0, identityCommits = 0, failAvatar = false;
  const input = {
    userId: "QA_TEST_USER_A", avatarTmpPath: "tmp/avatar.jpg" as string | null,
    identityTmpPath: "tmp/identity.jpg" as string | null, cache,
    commitAvatar: async () => { avatarCommits++; if (failAvatar) throw new Error("UPLOAD_FAILED"); return { publicUrl: "https://qa.invalid/avatar.jpg" }; },
    commitIdentity: async () => { identityCommits++; return { publicUrl: "https://qa.invalid/identity.jpg" }; },
  };
  assert.deepEqual(await prepareProfilePhotoReferences({ ...input, avatarTmpPath: null, identityTmpPath: null }), {});
  assert.deepEqual(await prepareProfilePhotoReferences(input), { avatarUrl: "https://qa.invalid/avatar.jpg", profilePhotoUrl: "https://qa.invalid/identity.jpg" });
  // Simulate a rejected PostgreSQL update after the successful moves.
  assert.deepEqual(await prepareProfilePhotoReferences({ ...input, avatarTmpPath: null, identityTmpPath: null }), { avatarUrl: "https://qa.invalid/avatar.jpg", profilePhotoUrl: "https://qa.invalid/identity.jpg" });
  assert.equal(avatarCommits, 1); assert.equal(identityCommits, 1);
  failAvatar = true;
  await assert.rejects(prepareProfilePhotoReferences({ ...input, avatarTmpPath: "tmp/replacement.jpg", identityTmpPath: null }), /UPLOAD_FAILED/);
  assert.equal(cache.avatar, undefined); assert.ok(cache.identity);
  failAvatar = false;
  await prepareProfilePhotoReferences({ ...input, avatarTmpPath: "tmp/replacement.jpg", identityTmpPath: null });
  assert.equal(identityCommits, 1);
  const independent: ProfilePhotoCommitCache = {};
  const identityOnly = await prepareProfilePhotoReferences({ ...input, cache: independent, avatarTmpPath: null });
  assert.deepEqual(identityOnly, { profilePhotoUrl: "https://qa.invalid/identity.jpg" });
  // Never carry a prepared reference across users.
  assert.deepEqual(await prepareProfilePhotoReferences({ ...input, userId: "QA_TEST_USER_B", cache: independent, avatarTmpPath: null, identityTmpPath: null }), {});
  const partial: ProfilePhotoCommitCache = {};
  failAvatar = true;
  const previousIdentityCommits = identityCommits;
  await assert.rejects(prepareProfilePhotoReferences({ ...input, cache: partial }), /UPLOAD_FAILED/);
  assert.ok(partial.identity); assert.equal(partial.avatar, undefined);
  failAvatar = false;
  await prepareProfilePhotoReferences({ ...input, cache: partial, identityTmpPath: null });
  assert.equal(identityCommits, previousIdentityCommits + 1);
  console.log("PASS: independent photos, retry after database failure, partial move failure, replacement and user isolation. Isolated orchestration tests; no real Storage.");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
