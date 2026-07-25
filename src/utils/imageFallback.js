/**
 * SVG Data URI Fallbacks for broken or offline images
 */
export const DEFAULT_FAMILY_AVATAR = 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=300&q=80';

export const DEFAULT_MEMBER_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

export const DEFAULT_RECIPE_IMAGE = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=600&q=80';

/**
 * Handle img onError event cleanly without infinite loops
 */
export function handleImgError(e, fallbackUrl = DEFAULT_FAMILY_AVATAR) {
  e.target.onerror = null;
  e.target.src = fallbackUrl;
}
