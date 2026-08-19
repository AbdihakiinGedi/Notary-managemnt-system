export default function formatAssetId(id) {
  if (!id) return 'AST-UNKNOWN';
  if (id.startsWith('AST-')) return id;
  // If it's a UUID or just a string, take the first 8 chars
  const short = id.replace(/-/g, '').substring(0, 8).toUpperCase();
  return `AST-${short}`;
}
