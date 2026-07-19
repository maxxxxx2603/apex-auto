const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic', '.heif', '.bmp'];

// Certains clients Discord (mobile, presse-papier, HEIC iPhone...) n'envoient pas toujours un
// contentType fiable sur la pièce jointe. On vérifie donc aussi l'extension du nom de fichier en secours.
function isImageAttachment(attachment) {
  if (attachment.contentType && attachment.contentType.startsWith('image/')) return true;
  const name = (attachment.name || '').toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

module.exports = { isImageAttachment };
