// Lógica de cálculo de la app de finanzas. Funciones puras: no tocan el DOM ni Firebase.
// Todas reciben números (o cosas que parecen números) y devuelven números u objetos simples.
import { UMBRALES, UMBRALES_EMPRESA } from "./umbrales.js";

export const DIAS_MES = 30;

/** Convierte lo que venga (string, null, "1,200.50") a número >= 0. Lo inválido vale 0. */
export function num(v) {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : 0;
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Suma de gastos fijos. Acepta un mapa {categoria: monto} (las categorías son libres) o un número. */
export function totalGastos(gastos) {
  if (gastos == null) return 0;
  if (typeof gastos !== "object") return num(gastos);
  return Object.values(gastos).reduce((s, v) => s + num(v), 0);
}

/** Categorías de gasto fijo con las que arranca un negocio. El usuario puede cambiarlas. */
export const CATEGORIAS_BASE = { renta: { nombre: "Renta", orden: 1 }, sueldos: { nombre: "Sueldos", orden: 2 }, servicios: { nombre: "Servicios (luz, agua, internet…)", orden: 3 }, otros: { nombre: "Otros gastos fijos", orden: 4 } };
/** Lista ordenada [{id, nombre}] a partir del mapa de categorías (o las base si no hay). */
export function listaCategorias(categorias) {
  const src = categorias && Object.keys(categorias).length ? categorias : CATEGORIAS_BASE;
  return Object.entries(src).map(([id, c]) => ({ id, nombre: String(c?.nombre || id), orden: Number(c?.orden) || 0 }))
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
}
/** Id corto y seguro para una categoría nueva (letras, números y guiones). */
export function idCategoria(nombre, existentes = {}) {
  let base = String(nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "gasto";
  let id = base, n = 2;
  while (existentes[id]) id = `${base}-${n++}`;
  return id;
}

// ---------- Diario: de los días al mes ----------
/**
 * dias = { "YYYY-MM-DD": { ventas, compras, gastos:{cat: monto}, nota } }
 * Devuelve los totales del mes indicado: { n, ventas, costoVentas, gastos:{cat: suma} }.
 * "compras" del día se toma como costo de lo vendido del mes (lo práctico en un negocio chico).
 */
export function resumenDias(dias, mesClave) {
  const r = { n: 0, ventas: 0, costoVentas: 0, gastos: {} };
  for (const [fecha, d] of Object.entries(dias || {})) {
    if (!fecha.startsWith(mesClave + "-") || !d) continue;
    r.n++; r.ventas += num(d.ventas); r.costoVentas += num(d.compras);
    for (const [cat, monto] of Object.entries(d.gastos || {})) if (num(monto) > 0) r.gastos[cat] = (r.gastos[cat] || 0) + num(monto);
  }
  return r;
}
/** Valida un día antes de guardar. */
export function validarDia(d) {
  const err = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || "")) err.push("Elige la fecha.");
  const esNum = (v) => v === "" || v == null || (Number.isFinite(parseFloat(String(v).replace(/[$,\s]/g, ""))) && parseFloat(String(v).replace(/[$,\s]/g, "")) >= 0);
  if (!esNum(d.ventas)) err.push("Ventas: escribe un número positivo.");
  if (!esNum(d.compras)) err.push("Compras: escribe un número positivo.");
  for (const [k, v] of Object.entries(d.gastos || {})) if (!esNum(v)) err.push(`Gasto (${k}): escribe un número positivo.`);
  if (!err.length && !num(d.ventas) && !num(d.compras) && !totalGastos(d.gastos)) err.push("Anota al menos un número del día.");
  return err;
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
  for (const [k, v] of Object.entries(g)) if (!esNum(v)) err.push(`Gastos (${k}): escribe un número positivo.`);
  for (const [k, v] of Object.entries(mes.empresa || {})) if (!esNum(v)) err.push(`${CAMPOS_EMPRESA[k]?.label || k}: escribe un número positivo.`);
  if (modo === "avanzado" || modo === "empresa") {
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


// ============================================================
// MODO EMPRESA: estados financieros, flujo de efectivo y razones
// ============================================================
/** Campos extra del mes en modo empresa (todos en pesos, al cierre del mes). */
export const CAMPOS_EMPRESA = {
  // Estado de resultados (lo que no es gasto fijo "de caja")
  depreciacion: { grupo: "resultados", label: "Depreciación y amortización", ayuda: "Desgaste de tus equipos, local o vehículos repartido en el mes. No sale dinero, pero sí es un costo real. Tu contador la calcula; si no la tienes, pon 0." },
  intereses: { grupo: "resultados", label: "Intereses pagados", ayuda: "Solo los intereses de préstamos o tarjetas del negocio. El pago a capital va en financiamiento, abajo." },
  impuestos: { grupo: "resultados", label: "Impuestos sobre la utilidad", ayuda: "ISR del mes (o la parte proporcional). El IVA no va aquí: no es un costo tuyo." },
  // Balance al cierre
  cuentasPorCobrar: { grupo: "activo", label: "Cuentas por cobrar", ayuda: "Lo que tus clientes te deben al último día del mes (ventas a crédito, fiado)." },
  inventario: { grupo: "activo", label: "Inventario", ayuda: "Mercancía o materia prima que tienes al cierre, a lo que te costó (no a precio de venta)." },
  otrosActivosCirc: { grupo: "activo", label: "Otros activos circulantes", ayuda: "Anticipos a proveedores, impuestos a favor, depósitos en garantía que recuperas en menos de un año." },
  activoFijo: { grupo: "activo", label: "Activo fijo (neto)", ayuda: "Equipo, maquinaria, vehículos, local propio, ya restando la depreciación acumulada." },
  cuentasPorPagar: { grupo: "pasivo", label: "Cuentas por pagar a proveedores", ayuda: "Lo que debes a proveedores al cierre del mes." },
  deudaCortoPlazo: { grupo: "pasivo", label: "Deuda a corto plazo", ayuda: "Préstamos, tarjetas y líneas que vencen en menos de un año (saldo al cierre), más impuestos y sueldos pendientes de pago." },
  deudaLargoPlazo: { grupo: "pasivo", label: "Deuda a largo plazo", ayuda: "Préstamos que vencen después de un año (saldo al cierre)." },
  // Movimientos del mes para el flujo
  capex: { grupo: "flujo", label: "Compra de activos fijos", ayuda: "Lo que invertiste en el mes en equipo, maquinaria, mobiliario o remodelación." },
  prestamosRecibidos: { grupo: "flujo", label: "Préstamos recibidos", ayuda: "Dinero que entró por créditos nuevos en el mes." },
  pagosDeuda: { grupo: "flujo", label: "Pagos a capital de deuda", ayuda: "Lo que abonaste a capital (sin intereses) de préstamos en el mes." },
  aportaciones: { grupo: "flujo", label: "Aportaciones de los dueños", ayuda: "Dinero que los socios metieron al negocio en el mes." },
  retiros: { grupo: "flujo", label: "Retiros o dividendos", ayuda: "Dinero que los socios sacaron del negocio en el mes (aparte de sueldo, si ya lo pusiste en gastos fijos)." },
};
export const GRUPOS_EMPRESA = {
  resultados: { titulo: "Depreciación, intereses e impuestos", sub: "Para pasar de la utilidad de operación a la utilidad neta." },
  activo: { titulo: "Lo que tienes al cierre (activos)", sub: "Además de la caja que ya capturaste arriba." },
  pasivo: { titulo: "Lo que debes al cierre (pasivos)", sub: "Saldos al último día del mes." },
  flujo: { titulo: "Inversión y financiamiento del mes", sub: "Movimientos de dinero que no son operación." },
};

const div = (a, b) => (b > 0 ? a / b : (a > 0 ? Infinity : 0));

/**
 * Calcula estados financieros y razones a partir de un mes en modo empresa.
 * mes = { ventas, costoVentas, gastos, caja, empresa:{...}, anterior? }
 * Devuelve { resultados, balance, flujo, razones, semaforo, notas }. Todo en pesos y veces.
 */
export function resultadosEmpresa(mes, umb = UMBRALES_EMPRESA) {
  const e = mes.empresa || {}, g = (k) => num(e[k]);
  const ventas = num(mes.ventas), costoVentas = num(mes.costoVentas), gastosFijos = totalGastos(mes.gastos), caja = num(mes.caja);
  // --- Estado de resultados
  const utilidadBruta = ventas - costoVentas;
  const ebitda = utilidadBruta - gastosFijos;                 // utilidad de operación antes de depreciación
  const utilidadOperativa = ebitda - g("depreciacion");        // EBIT
  const uai = utilidadOperativa - g("intereses");              // antes de impuestos
  const utilidadNeta = uai - g("impuestos");
  const resultados = { ventas, costoVentas, utilidadBruta, gastosFijos, ebitda, depreciacion: g("depreciacion"), utilidadOperativa,
    intereses: g("intereses"), uai, impuestos: g("impuestos"), utilidadNeta, margenNeto: ventas > 0 ? utilidadNeta / ventas : 0, margenEbitda: ventas > 0 ? ebitda / ventas : 0 };
  // --- Balance
  const activoCirc = caja + g("cuentasPorCobrar") + g("inventario") + g("otrosActivosCirc");
  const activoTotal = activoCirc + g("activoFijo");
  const pasivoCirc = g("cuentasPorPagar") + g("deudaCortoPlazo");
  const pasivoTotal = pasivoCirc + g("deudaLargoPlazo");
  const balance = { caja, cuentasPorCobrar: g("cuentasPorCobrar"), inventario: g("inventario"), otrosActivosCirc: g("otrosActivosCirc"), activoCirc, activoFijo: g("activoFijo"), activoTotal,
    cuentasPorPagar: g("cuentasPorPagar"), deudaCortoPlazo: g("deudaCortoPlazo"), pasivoCirc, deudaLargoPlazo: g("deudaLargoPlazo"), pasivoTotal, capital: activoTotal - pasivoTotal };
  // --- Flujo de efectivo (método indirecto): parte de la utilidad y ajusta lo que no fue dinero
  const ant = mes.anterior ? { e: mes.anterior.empresa || {}, caja: num(mes.anterior.caja) } : null;
  const dlt = (k) => (ant ? g(k) - num(ant.e[k]) : 0);
  const capitalTrabajo = ant ? -dlt("cuentasPorCobrar") - dlt("inventario") - dlt("otrosActivosCirc") + dlt("cuentasPorPagar") : 0;
  const operativo = utilidadNeta + g("depreciacion") + capitalTrabajo;
  const inversion = -g("capex");
  const financiamiento = g("prestamosRecibidos") - g("pagosDeuda") + g("aportaciones") - g("retiros");
  const neto = operativo + inversion + financiamiento;
  const flujo = { utilidadNeta, depreciacion: g("depreciacion"), dCuentasPorCobrar: ant ? -dlt("cuentasPorCobrar") : 0, dInventario: ant ? -dlt("inventario") : 0, dOtrosActivos: ant ? -dlt("otrosActivosCirc") : 0,
    dCuentasPorPagar: ant ? dlt("cuentasPorPagar") : 0, operativo, capex: -g("capex"), inversion, prestamosRecibidos: g("prestamosRecibidos"), pagosDeuda: -g("pagosDeuda"), aportaciones: g("aportaciones"), retiros: -g("retiros"), financiamiento, neto,
    cajaInicial: ant ? ant.caja : null, cajaFinalCalculada: ant ? ant.caja + neto : null, cajaReal: caja, diferencia: ant ? caja - (ant.caja + neto) : null, conAnterior: !!ant };
  // --- Razones
  const invProm = ant && num(ant.e.inventario) > 0 ? (g("inventario") + num(ant.e.inventario)) / 2 : g("inventario");
  const razones = {
    razonCirculante: div(activoCirc, pasivoCirc),
    pruebaAcido: div(activoCirc - g("inventario"), pasivoCirc),
    diasInventario: costoVentas > 0 ? g("inventario") / (costoVentas / DIAS_MES) : (g("inventario") > 0 ? Infinity : 0),
    rotacionInventario: invProm > 0 ? (costoVentas * 12) / invProm : (costoVentas > 0 ? Infinity : 0),
    diasCobro: ventas > 0 ? g("cuentasPorCobrar") / (ventas / DIAS_MES) : (g("cuentasPorCobrar") > 0 ? Infinity : 0),
    diasPago: costoVentas > 0 ? g("cuentasPorPagar") / (costoVentas / DIAS_MES) : 0,
    apalancamiento: activoTotal > 0 ? pasivoTotal / activoTotal : 0,
    coberturaIntereses: g("intereses") > 0 ? utilidadOperativa / g("intereses") : (utilidadOperativa >= 0 ? Infinity : 0),
    roa: activoTotal > 0 ? (utilidadNeta * 12) / activoTotal : 0,
    roe: balance.capital > 0 ? (utilidadNeta * 12) / balance.capital : 0,
  };
  razones.cicloEfectivo = (Number.isFinite(razones.diasInventario) ? razones.diasInventario : 0) + (Number.isFinite(razones.diasCobro) ? razones.diasCobro : 0) - razones.diasPago;
  const semaforo = {
    razonCirculante: pasivoCirc > 0 ? semaforoR(razones.razonCirculante, umb.razonCirculante) : "verde",
    pruebaAcido: pasivoCirc > 0 ? semaforoR(razones.pruebaAcido, umb.pruebaAcido) : "verde",
    diasInventario: g("inventario") > 0 ? semaforoR(razones.diasInventario, umb.diasInventario) : "verde",
    diasCobro: g("cuentasPorCobrar") > 0 ? semaforoR(razones.diasCobro, umb.diasCobro) : "verde",
    cicloEfectivo: semaforoR(razones.cicloEfectivo, umb.cicloEfectivo),
    apalancamiento: semaforoR(razones.apalancamiento, umb.apalancamiento),
    coberturaIntereses: g("intereses") > 0 ? semaforoR(razones.coberturaIntereses, umb.coberturaIntereses) : "verde",
  };
  const notas = [];
  if (!ant) notas.push("Es tu primer mes en modo empresa: el flujo no puede calcular los cambios en cuentas por cobrar, inventario y proveedores. Desde el mes que viene sí.");
  if (ant && Math.abs(flujo.diferencia) > Math.max(500, ventas * 0.02)) notas.push(`La caja real (${fmtMXN(caja)}) no cuadra con la que resulta del flujo (${fmtMXN(flujo.cajaFinalCalculada)}): diferencia de ${fmtMXN(flujo.diferencia)}. Suele ser un movimiento que no anotaste (un retiro, una compra de equipo, un préstamo) o un saldo mal capturado.`);
  if (balance.capital < 0) notas.push("Debes más de lo que tienes (capital negativo). Es la señal más seria: platícalo con tu contador o con nosotros antes de pedir más crédito.");
  return { resultados, balance, flujo, razones, semaforo, notas, frases: frasesEmpresa(razones, semaforo, balance, resultados) };
}
function semaforoR(v, u) { return semaforo(v, u); }

/** Frases de negocio para cada razón. */
export function frasesEmpresa(r, s, b, res) {
  const f = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "—");
  return {
    razonCirculante: b.pasivoCirc === 0 ? "No tienes deudas a corto plazo: nada que cubrir." : `Por cada $1 que debes a corto plazo tienes $${f(r.razonCirculante, 2)} para pagarlo (caja, por cobrar e inventario).`,
    pruebaAcido: b.pasivoCirc === 0 ? "Sin deudas a corto plazo, la prueba del ácido no aplica." : `Sin contar el inventario, tienes $${f(r.pruebaAcido, 2)} por cada $1 que debes a corto plazo. ${s.pruebaAcido === "rojo" ? "Dependes de vender inventario para pagar." : "Puedes pagar sin malbaratar mercancía."}`,
    diasInventario: b.inventario === 0 ? "No registraste inventario." : Number.isFinite(r.diasInventario) ? `Tu inventario tarda unos ${Math.round(r.diasInventario)} días en venderse (rota ${f(r.rotacionInventario)} veces al año).` : "Tienes inventario pero no registraste costo de ventas: no se puede saber cuánto tarda en venderse.",
    diasCobro: b.cuentasPorCobrar === 0 ? "Cobras de contado: nadie te debe." : Number.isFinite(r.diasCobro) ? `Tus clientes tardan unos ${Math.round(r.diasCobro)} días en pagarte.` : "Te deben dinero pero no hubo ventas: no se puede calcular el plazo de cobro.",
    cicloEfectivo: r.cicloEfectivo <= 0 ? `Tus proveedores te financian: cobras antes de pagarles (ciclo de ${Math.round(r.cicloEfectivo)} días). Excelente para la caja.` : `Financias tú la operación durante ${Math.round(r.cicloEfectivo)} días: desde que pagas la mercancía hasta que cobras la venta (pagas a ${Math.round(r.diasPago)} días).`,
    apalancamiento: `${Math.round(r.apalancamiento * 100)} % de lo que tiene el negocio está financiado con deuda; el resto (${Math.round(Math.max(0, 1 - r.apalancamiento) * 100)} %) es de los dueños.`,
    coberturaIntereses: res.intereses === 0 ? "No pagaste intereses este mes." : Number.isFinite(r.coberturaIntereses) ? `Tu utilidad de operación cubre ${f(r.coberturaIntereses)} veces los intereses que pagas.` : "No hay utilidad de operación para cubrir los intereses.",
    rentabilidad: b.activoTotal > 0 ? `Anualizado, el negocio rinde ${Math.round(r.roa * 100)} % sobre todo lo que tiene (ROA)${b.capital > 0 ? ` y ${Math.round(r.roe * 100)} % sobre el dinero de los dueños (ROE)` : ""}.` : "Captura tus activos para calcular la rentabilidad sobre lo invertido.",
  };
}
