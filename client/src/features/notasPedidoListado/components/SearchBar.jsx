export default function SearchBar({ q, setQ, onSearch, loading }) {
  return (
    <div className="npl-toolbar">
      <input
        className="npl-input"
        placeholder="Buscar por número, cliente o teléfono..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
      />
      <button
        className="npl-btn"
        type="button"
        onClick={onSearch}
        disabled={loading}
      >
        {loading ? "Buscando..." : "Buscar"}
      </button>
    </div>
  );
}
