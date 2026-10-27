export function MaterialIcon({ material }: { material: string }) {
  if (material === 'papel') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/></svg>;
  if (material === 'plastico') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v3l2 2v12H7V8l2-2zM9 8h6M9 12h6M12 3v3"/></svg>;
  if (material === 'vidro') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v3l2 2v12H7V8l2-2zM8 13h8M10 3v3"/></svg>;
  if (material === 'metal') return <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="7" ry="2.5"/><path d="M5 5v14c0 1.4 14 1.4 14 0V5M5 18.5c0 1.4 14 1.4 14 0M8 5v1"/></svg>;
  if (material === 'loja') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16v11H4zM3 9l2-5h14l2 5M8 13v3m4-3v3m4-3v3"/></svg>;
  if (material === 'mapa') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8.5 4.2 2.1-2.1 2.2 3.8-2.2 1.2-2.1-2.9Zm7.2-.1 2.8.1-2.2 3.8L14 6.7l1.7-2.6ZM5.2 9H2.5l2.1 3.8 2.3-1.3L5.2 9Zm13.6 0h2.7l-2.1 3.8-2.3-1.3L18.8 9ZM8 18.5l-1.4 2.3H11v-2.6H8Zm8 0 1.4 2.3H13v-2.6h3ZM7.4 7h9.2L12 15z"/></svg>;
}
