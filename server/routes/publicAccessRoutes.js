/**
 * Public, pre-login access: private discovery and first-family registration.
 * All persistence and authorization rules remain injected by the application
 * so this module cannot silently acquire a second source of truth.
 */
export function registerPublicAccessRoutes(app, {
  demoFamilyId,
  getFamily,
  listPublicFamilies,
  publicFamilyDirectory,
  publicRegistrationStatus,
  authRateLimit,
  ensureObject,
  constantTimeTextMatch,
  registrationInviteCode,
  requireText,
  translate,
  cleanText,
  normalizeMemberInput,
  isManagedMember,
  isAdultMember,
  createFamily,
  createSession,
  getSession,
  clearAuthAttempts,
  sessionCookie,
  secureCookieForRequest,
  publicSessionPayload,
  nativeSessionTokenPayload,
  sessionMaxAgeMs
}) {
  app.get('/api/public/families', (_req, res) => {
    const demoFamily = demoFamilyId ? getFamily(demoFamilyId) : null;
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      directoryEnabled: publicFamilyDirectory,
      families: publicFamilyDirectory ? listPublicFamilies() : [],
      demo: demoFamily
        ? {
            familyName: demoFamily.familyName,
            familyAvatar: demoFamily.familyAvatar,
            badge: demoFamily.badge
          }
        : null,
      registration: publicRegistrationStatus()
    });
  });

  app.post('/api/public/register', authRateLimit, (req, res) => {
    const input = ensureObject(req.body);
    const registration = publicRegistrationStatus();
    if (!registration.allowed) {
      return res.status(403).json({
        success: false,
        error: translate('errors.registrationClosed')
      });
    }
    if (
      registration.requiresInvite &&
      !constantTimeTextMatch(input.inviteCode, registrationInviteCode)
    ) {
      return res.status(403).json({
        success: false,
        error: translate('errors.inviteCodeInvalid')
      });
    }
    const familyName = requireText(
      input.familyName,
      translate('fields.familyName'),
      100
    );
    const password = requireText(input.password, translate('fields.password'), 100);
    if (password.length < 10) {
      return res.status(400).json({
        success: false,
        error: translate('errors.familyPasswordTooShort')
      });
    }
    const members = Array.isArray(input.members) ? input.members : [];
    if (members.length === 0) {
      return res.status(400).json({
        success: false,
        error: translate('errors.membersRequired')
      });
    }
    const normalizedMembers = members.slice(0, 20).map(normalizeMemberInput);
    if (!normalizedMembers.some(member => !isManagedMember(member))) {
      return res.status(400).json({
        success: false,
        error: translate('errors.loginProfileRequired')
      });
    }
    if (!normalizedMembers.some(isAdultMember)) {
      return res.status(400).json({
        success: false,
        error: translate('errors.adminProfileRequired')
      });
    }
    const result = createFamily({
      familyName,
      familyAvatar: cleanText(input.familyAvatar, '', 1_200_000),
      badge: cleanText(input.badge, 'Unsere Familie', 60),
      password,
      members: normalizedMembers
    });
    const initialMember =
      result.members.find(isAdultMember) ||
      result.members.find(member => !isManagedMember(member));
    const sessionToken = createSession(result.family.id, {
      memberId: initialMember?.id || null,
      maxAgeMs: sessionMaxAgeMs
    });
    const session = getSession(sessionToken);
    clearAuthAttempts(req);
    res.setHeader('Set-Cookie', sessionCookie(sessionToken, secureCookieForRequest(req)));
    res.status(201).json({
      success: true,
      family: result.family,
      members: result.members,
      activeMemberId: initialMember?.id || null,
      session: publicSessionPayload(session),
      ...nativeSessionTokenPayload(req, sessionToken)
    });
    const cloudProvisioning = setTimeout(() => {
      void app.locals.provisionBundledCloudFamily(result.family.id)
        .catch(error => {
          console.warn(
            `Family Cloud für neue Familie ${result.family.id} konnte nicht eingerichtet werden:`,
            error.message
          );
        });
    }, 250);
    cloudProvisioning.unref();
  });
}
