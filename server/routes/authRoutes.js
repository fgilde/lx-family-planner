/**
 * Family and profile login. Database and cookie functions are injected so the
 * HTTP boundary is separate from storage/session implementation details.
 */
export function registerAuthRoutes(app, {
  authRateLimit,
  ensureObject,
  requireText,
  translate,
  findFamilyAuthCandidates,
  verifySecret,
  createSession,
  sessionMaxAgeMs,
  getSession,
  clearAuthAttempts,
  sessionCookie,
  secureCookieForRequest,
  publicSessionPayload,
  nativeSessionTokenPayload,
  getFamily,
  getBootstrap,
  requireAuth,
  getMemberAuthRow,
  isManagedMember,
  isAdultMember,
  getMember,
  getFamilyAuthRow,
  cleanText,
  setSessionMember,
  deleteSession,
  clearSessionCookie
}) {
  app.post('/api/auth/family', authRateLimit, (req, res) => {
    const input = ensureObject(req.body);
    const familyReference = requireText(
      input.familyId || input.familyName,
      translate('fields.family'),
      100
    );
    const password = requireText(input.password, translate('fields.password'), 100);
    const familyRow = findFamilyAuthCandidates(familyReference).find(
      candidate => verifySecret(password, candidate.password_hash)
    );
    if (!familyRow) {
      return res.status(401).json({
        success: false,
        error: translate('errors.familyOrPasswordIncorrect')
      });
    }
    const familyId = familyRow.id;
    const sessionToken = createSession(familyId, { maxAgeMs: sessionMaxAgeMs });
    const session = getSession(sessionToken);
    clearAuthAttempts(req);
    res.setHeader(
      'Set-Cookie',
      sessionCookie(sessionToken, secureCookieForRequest(req))
    );
    res.json({
      success: true,
      family: getFamily(familyId),
      members: getBootstrap(familyId).members,
      session: publicSessionPayload(session),
      ...nativeSessionTokenPayload(req, sessionToken)
    });
  });

  app.post('/api/auth/member', requireAuth, (req, res) => {
    const input = ensureObject(req.body);
    const memberId = requireText(input.memberId, translate('fields.profile'), 100);
    const memberRow = getMemberAuthRow(req.session.familyId, memberId);
    if (!memberRow) {
      return res.status(404).json({
        success: false,
        error: translate('errors.profileNotFound')
      });
    }
    if (isManagedMember(memberRow)) {
      return res.status(403).json({
        success: false,
        error: translate('errors.managedProfileNoLogin')
      });
    }
    const currentMember = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    const targetIsAdult = isAdultMember(memberRow);
    const currentIsAdult = isAdultMember(currentMember);
    if (targetIsAdult && currentMember && !currentIsAdult && !memberRow.pin_hash) {
      const familyRow = getFamilyAuthRow(req.session.familyId);
      if (
        !verifySecret(
          cleanText(input.familyPassword, '', 100),
          familyRow.password_hash
        )
      ) {
        return res.status(401).json({
          success: false,
          error: translate('errors.familyPasswordRequiredForAdult'),
          requiresFamilyPassword: true
        });
      }
    }
    if (memberRow.pin_hash && !verifySecret(cleanText(input.pin, '', 12), memberRow.pin_hash)) {
      return res.status(401).json({
        success: false,
        error: translate('errors.pinIncorrect')
      });
    }
    setSessionMember(req.sessionToken, req.session.familyId, memberId);
    req.session = getSession(req.sessionToken);
    res.json({
      success: true,
      member: getMember(req.session.familyId, memberId),
      session: publicSessionPayload(req.session)
    });
  });

  app.get('/api/auth/session', (req, res) => {
    if (!req.session) {
      return res.status(401).json({ success: false, authenticated: false });
    }
    res.json({
      success: true,
      authenticated: true,
      session: publicSessionPayload(req.session),
      family: getFamily(req.session.familyId),
      member: req.session.memberId
        ? getMember(req.session.familyId, req.session.memberId)
        : null
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    if (req.sessionToken) deleteSession(req.sessionToken);
    res.setHeader(
      'Set-Cookie',
      clearSessionCookie(secureCookieForRequest(req))
    );
    res.json({ success: true });
  });
}
