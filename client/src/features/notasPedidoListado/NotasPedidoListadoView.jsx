import "../../css/NotasPedidoListado.css";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useNotasPedidoListado } from "./hooks/useNotasPedidoListado";
import { guardarCajaNota } from "../../services/notasPedido";

import SearchBar from "./components/SearchBar";
import NotasTable from "./components/NotasTable";
import NotaDetalleModal from "./components/NotaDetalleModal";

export default function NotasPedidoListadoView() {
  // ...
}
