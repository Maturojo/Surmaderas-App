export default function SearchBar({ q, setQ, onSearch, loading }) {
  return (
    <div className="npl-toolbar">
      <div className="npl-searchField">
        <span className="npl-searchIcon">⌕</span>
        <input
          className="npl-input"
          placeholder="Buscar por numero, cliente o telefono..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
      </div>
      <button className="npl-btn npl-btn--primary" type="button" onClick={onSearch} disabled={loading}>
        {loading ? "Buscando..." : "Buscar"}
      </button>
    </div>
  );
}
