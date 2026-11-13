// Lógica de cálculo de la app de finanzas. Funciones puras: no tocan el DOM ni Firebase.
// Todas reciben números (o cosas que parecen números) y devuelven números u objetos simples.
import { UMBRALES } from "./umbrales.js";

export const DIAS_MES = 30;

/** Convierte lo que venga (string, null, "1,200.50") a número >= 0. Lo inválido vale 0. */
export function num(v) {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : 0;
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Suma de gastos fijos. Acepta {renta,sueldos,servicios,otros} o un número. */
export function totalGastos(gastos) {
  if (gastos == null) return 0;
  if (typeof gastos !== "object") return num(gastos);
  return ["renta", "sueldos", "servicios", "otros"].reduce((s, k) => s + num(gastos[k]), 0);
}

// ---------- Utilidad y margen ----------
export function utilidadBruta(ventas, costoVentas) { return num(ventas) - num(costoVentas); }
export function margenBruto(ventas, costoVentas) {
  const v = num(ventas); return v > 0 ? utilidadBruta(v, costoVentas) / v : 0;
}
export function utilidadNeta(ventas, costoVentas, gastos) { return utilidadBruta(ventas, costoVentas) - totalGastos(gastos); }
export function margenNeto(ventas, costoVentas, gastos) {
  const v = num(ventas); return v > 0 ? utilidadNeta(v, costoVentas, gastos) / v : 0;
}

// ---------- Punto de equilibrio ----------
/** Ventas necesarias para no perder = gastos fijos / margen bruto. Infinity si el margen es 0 o negativo. */
export function puntoEquilibrio(gastos, margen) {
  const g = totalGastos(gastos);
  if (g === 0) return 0;
  return margen > 0 ? g / margen : Infinity;
}
/** Cuántas veces cubres tu punto de equilibrio con las ventas del mes (1 = apenas). */
export function cobertura(ventas, pe) {
  const v = num(ventas);
  if (pe === 0) return v > 0 ? Infinity : 1;
  if (!Number.isFinite(pe)) return 0;
  return v / pe;
}

// ---------- Días de caja ----------
/** Días que alcanza el dinero: caja / salida diaria (gastos fijos + costo de ventas) / 30. */
export function diasCaja(caja, gastos, costoVentas, diasMes = DIAS_MES) {
  const salidaDiaria = (totalGastos(gastos) + num(costoVentas)) / diasMes;
  if (salidaDiaria === 0) return Infinity;
  return num(caja) / salidaDiaria;
}

// ---------- Rentabilidad por producto ----------
/**
 * Recibe lista o mapa de {nombre, precio, costo, unidades}.
 * Devuelve lista ordenada de mayor a menor contribución (lo que cada producto deja en total).
 */
export function rentabilidadProductos(productos, umbral = UMBRALES.productoMargen) {
  const lista = Array.isArray(productos) ? productos : Object.values(productos || {});
  const filas = lista
    .filter((p) => p && String(p.nombre || "").trim())
    .map((p) => {
      const precio = num(p.precio), costo = num(p.costo), unidades = num(p.unidades);
      const margenUnit = precio - costo;
      const margenPct = precio > 0 ? margenUnit / precio : 0;
      return { nombre: String(p.nombre).trim(), precio, costo, unidades, margenUnit, margenPct,
        ventas: precio * unidades, contribucion: margenUnit * unidades, color: semaforo(margenPct, umbral) };
    })
    .sort((a, b) => b.contribucion - a.contribucion);
  const total = filas.reduce((s, f) => s + Math.max(0, f.contribucion), 0);
  filas.forEach((f) => { f.participacion = total > 0 ? Math.max(0, f.contribucion) / total : 0; });
  return filas;
}

// ---------- Semáforo ----------
export function semaforo(valor, umbral) {
  if (!umbral) return "amarillo";
  if (!Number.isFinite(valor)) return valor === Infinity && !umbral.mayorEsPeor ? "verde" : "rojo";
  if (umbral.mayorEsPeor) {
    if (valor <= umbral.verde) return "verde";
    if (valor <= umbral.amarillo) return "amarillo";
    return "rojo";
  }
  if (valor >= umbral.verde) return "verde";
  if (valor >= umbral.amarillo) return "amarillo";
  return "rojo";
}

// ---------- Formato (puro, sin DOM) ----------
export function fmtMXN(n, dec = 0) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n).toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return (Math.round(n) < 0 ? "−$" : "$") + abs;
}
export function fmtPct(x) { return Number.isFinite(x) ? Math.round(x * 100) + " %" : "—"; }
export function fmtDias(d) { return Number.isFinite(d) ? Math.round(d) + " días" : "sin salidas registradas"; }

// ---------- Todo junto: resultados de un mes ----------
/**
 * mes = { ventas, costoVentas, gastos:{...}|número, caja, productos? }
 * Devuelve números + semáforos + frases ya redactadas en lenguaje de negocio.
 */
export function resultadosMes(mes, umbrales = UMBRALES) {
  const ventas = num(mes.ventas), costoVentas = num(mes.costoVentas), caja = num(mes.caja);
  const gastos = totalGastos(mes.gastos);
  const uB = utilidadBruta(ventas, costoVentas), mB = margenBruto(ventas, costoVentas);
  const uN = utilidadNeta(ventas, costoVentas, gastos), mN = margenNeto(ventas, costoVentas, gastos);
  const pe = puntoEquilibrio(gastos, mB), cob = cobertura(ventas, pe);
  const dias = diasCaja(caja, gastos, costoVentas);
  const faltante = Number.isFinite(pe) ? Math.max(0, pe - ventas) : Infinity;
  const productos = rentabilidadProductos(mes.productos || [], umbrales.productoMargen);

  const sem = {
    margenBruto: semaforo(mB, umbrales.margenBruto),
    margenNeto: semaforo(mN, umbrales.margenNeto),
    cobertura: semaforo(cob, umbrales.cobertura),
    diasCaja: semaforo(dias, umbrales.diasCaja),
  };

  const frases = {
    utilidad: uN >= 0
      ? `Este mes te quedaron ${fmtMXN(uN)} después de pagar todo (${fmtPct(mN)} de lo que vendiste).`
      : `Este mes perdiste ${fmtMXN(-uN)}: gastaste más de lo que te dejaron las ventas.`,
    margenBruto: `De cada $100 que vendes, ${Math.round(mB * 100)} se quedan contigo después de pagar la mercancía o los insumos.`,
    equilibrio: !Number.isFinite(pe)
      ? "Con este margen no hay punto de equilibrio: cada venta te cuesta más de lo que cobras."
      : pe === 0 ? "No registraste gastos fijos, así que cualquier venta ya es ganancia."
      : faltante > 0
        ? `Necesitas vender ${fmtMXN(pe)} al mes para no perder. Te faltaron ${fmtMXN(faltante)}.`
        : `Necesitas vender ${fmtMXN(pe)} al mes para no perder. Lo superaste por ${fmtMXN(ventas - pe)}.`,
    caja: !Number.isFinite(dias)
      ? "No registraste salidas de dinero, así que no se puede calcular cuánto te dura la caja."
      : `El dinero que tienes alcanza para ${Math.round(dias)} días de operación si no entrara ni un peso más.`,
  };

  const r = { ventas, costoVentas, gastos, caja, utilidadBruta: uB, margenBruto: mB, utilidadNeta: uN, margenNeto: mN,
    puntoEquilibrio: pe, cobertura: cob, faltante, diasCaja: dias, productos, semaforo: sem, frases };
  r.recomendacion = recomendacion(r, mes.anterior ? resultadosMes(mes.anterior, umbrales) : null);
  return r;
}

/**
 * Una sola recomendación accionable. Reglas en orden de urgencia:
 * 1) margen bruto rojo  2) pierdes dinero  3) poca caja  4) producto que pierde  5) margen neto flojo
 * 6) todo bien: comparar con el mes anterior.
 */
export function recomendacion(r, ant = null) {
  const s = r.semaforo;
  if (r.ventas === 0) return "Captura tus ventas del mes para poder darte una recomendación.";
  if (s.margenBruto === "rojo") {
    const objetivo = UMBRALES.margenBruto.amarillo;
    const precioSugerido = r.costoVentas > 0 && objetivo < 1 ? r.costoVentas / (1 - objetivo) : 0;
    return `Tu margen bruto es muy bajo (${fmtPct(r.margenBruto)}). Revisa precios o negocia tus insumos: con lo que vendiste, ` +
      `necesitarías cobrar unos ${fmtMXN(precioSugerido)} en total (en vez de ${fmtMXN(r.ventas)}) para llegar a ${fmtPct(objetivo)}.`;
  }
  if (r.utilidadNeta < 0) {
    const recorte = Math.min(r.gastos, -r.utilidadNeta);
    return `Estás perdiendo ${fmtMXN(-r.utilidadNeta)}. Tienes dos caminos: vender ${fmtMXN(r.faltante)} más al mes ` +
      `o recortar ${fmtMXN(recorte)} de gastos fijos. Empieza por el que puedas mover esta semana.`;
  }
  if (s.diasCaja === "rojo") {
    const meta = UMBRALES.diasCaja.amarillo;
    const salidaDiaria = (r.gastos + r.costoVentas) / DIAS_MES;
    const faltaCaja = Math.max(0, meta * salidaDiaria - r.caja);
    return `Tu caja solo aguanta ${Math.round(r.diasCaja)} días. Junta ${fmtMXN(faltaCaja)} más como colchón ` +
      `(para llegar a ${meta} días): cobra pendientes, pide anticipos o aplaza compras que no urjan.`;
  }
  const perdedor = r.productos.find((p) => p.margenUnit < 0 && p.unidades > 0);
  if (perdedor) {
    return `"${perdedor.nombre}" se vende por debajo de su costo (pierdes ${fmtMXN(-perdedor.margenUnit)} por unidad). ` +
      `Súbele el precio a más de ${fmtMXN(perdedor.costo)} o déjalo de vender.`;
  }
  if (s.margenNeto !== "verde") {
    const objetivo = UMBRALES.margenNeto.verde;
    const gastoMax = r.utilidadBruta - objetivo * r.ventas;
    const recorte = Math.max(0, r.gastos - gastoMax);
    return `Ganas, pero poco (${fmtPct(r.margenNeto)} neto). Tus gastos fijos se comen casi todo: ` +
      `recortar ${fmtMXN(recorte)} al mes te llevaría a un ${fmtPct(objetivo)} neto. Revisa renta, servicios y sueldos.`;
  }
  if (r.productos.length >= 2) {
    const top = r.productos[0], bajo = r.productos[r.productos.length - 1];
    if (top.contribucion > 0 && bajo.contribucion < top.contribucion * 0.25) {
      return `Vas bien. "${top.nombre}" es el que más te deja (${fmtMXN(top.contribucion)} este mes): ` +
        `empújalo más y revisa si vale la pena seguir con "${bajo.nombre}", que casi no aporta.`;
    }
  }
  if (ant && ant.ventas > 0) {
    const cambio = (r.ventas - ant.ventas) / ant.ventas;
    if (cambio < -0.10) return `Ganas bien, pero vendiste ${fmtPct(-cambio)} menos que el mes pasado. Revisa qué cambió (clientes, horario, competencia) antes de que afecte la utilidad.`;
    if (cambio > 0.10) return `Buen mes: vendiste ${fmtPct(cambio)} más que el anterior y mantuviste el margen. Aparta parte de la utilidad (${fmtMXN(r.utilidadNeta * 0.2)}) como reserva.`;
  }
  return `Tus números están sanos. Aparta al menos ${fmtMXN(r.utilidadNeta * 0.2)} de esta utilidad como reserva y mantén tus gastos fijos donde están.`;
}

/** Ordena un mapa {YYYY-MM: mes} cronológicamente y calcula resultados de cada uno (para el historial). */
export function historial(meses, umbrales = UMBRALES) {
  const claves = Object.keys(meses || {}).filter((k) => /^\d{4}-\d{2}$/.test(k)).sort();
  let anterior = null;
  return claves.map((k) => {
    const r = resultadosMes({ ...meses[k], anterior }, umbrales);
    anterior = meses[k];
    return { clave: k, ...r };
  });
}

/** Valida los datos de un mes antes de guardar. Devuelve lista de errores (vacía = ok). */
export function validarMes(mes, modo = "simple") {
  const err = [];
  const esNum = (v) => v === "" || v == null || (Number.isFinite(parseFloat(String(v).replace(/[$,\s]/g, ""))) && parseFloat(String(v).replace(/[$,\s]/g, "")) >= 0);
  if (mes.ventas === "" || mes.ventas == null) err.push("Falta el total de ventas del mes.");
  for (const [k, label] of [["ventas", "Ventas"], ["costoVentas", "Costo de lo vendido"], ["caja", "Dinero en caja o banco"]]) {
    if (!esNum(mes[k])) err.push(`${label}: escribe un número positivo.`);
  }
  const g = mes.gastos || {};
  for (const k of ["renta", "sueldos", "servicios", "otros"]) if (!esNum(g[k])) err.push(`Gastos (${k}): escribe un número positivo.`);
  if (modo === "avanzado") {
    (Array.isArray(mes.productos) ? mes.productos : Object.values(mes.productos || {})).forEach((p, i) => {
      if (!p) return;
      const hayAlgo = String(p.nombre || "").trim() || p.precio || p.costo || p.unidades;
      if (!hayAlgo) return;
      if (!String(p.nombre || "").trim()) err.push(`Producto ${i + 1}: falta el nombre.`);
      for (const k of ["precio", "costo", "unidades"]) if (!esNum(p[k])) err.push(`Producto ${i + 1}: ${k} debe ser un número positivo.`);
    });
  }
  return err;
}

/** Avisos que no impiden guardar pero conviene mostrar. */
export function avisosMes(mes) {
  const av = [];
  if (num(mes.ventas) > 0 && num(mes.costoVentas) > num(mes.ventas)) av.push("El costo de lo vendido es mayor que las ventas. Si es correcto sigue, pero normalmente indica un error de captura.");
  if (num(mes.ventas) > 0 && totalGastos(mes.gastos) === 0) av.push("No pusiste gastos fijos. Si pagas renta, luz o sueldos, agrégalos para que el punto de equilibrio sea real.");
  return av;
}
