export default function SearchBar({ q, setQ, onSearch, loading, total }) {
  return (
    <div className="npl-toolbar">
      <div className="npl-toolbarMain">
        <div className="npl-searchField">
          <span className="npl-searchIcon">⌕</span>
          <input
            className="npl-input"
            placeholder="Buscar por numero, cliente o telefono..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
          {q ? (
            <button className="npl-searchClear" type="button" onClick={() => setQ("")}>
              Limpiar
            </button>
          ) : null}
        </div>
        <div className="npl-toolbarHint">
          {q ? `Filtrando sobre ${total} notas pendientes` : "Busca rapido por cliente, telefono o numero de nota"}
        </div>
      </div>
      <button className="npl-btn npl-btn--primary" type="button" onClick={onSearch} disabled={loading}>
        {loading ? "Buscando..." : "Buscar"}
      </button>
    </div>
  );
}
