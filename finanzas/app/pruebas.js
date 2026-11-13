// Pruebas simples de calculos.js. Corre en el navegador (pruebas.html) o en Node:
//   node --experimental-default-type=module finanzas/app/pruebas.js
import * as C from "./calculos.js";
import { UMBRALES } from "./umbrales.js";

const casos = [];
const prueba = (nombre, fn) => casos.push({ nombre, fn });
const casi = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
function esperar(cond, msg) { if (!cond) throw new Error(msg || "falló"); }

// --- num / totalGastos
prueba("num limpia texto y negativos", () => {
  esperar(C.num("$1,200.50") === 1200.5, "texto con $ y coma");
  esperar(C.num(-5) === 0 && C.num("abc") === 0 && C.num(null) === 0, "inválidos valen 0");
});
prueba("totalGastos suma el desglose o acepta un número", () => {
  esperar(C.totalGastos({ renta: 5000, sueldos: 8000, servicios: 1500, otros: 500 }) === 15000);
  esperar(C.totalGastos(12000) === 12000 && C.totalGastos(null) === 0);
});

// --- utilidad y margen (ejemplo: fonda)
const fonda = { ventas: 60000, costoVentas: 24000, gastos: { renta: 8000, sueldos: 12000, servicios: 3000, otros: 1000 }, caja: 20000 };
prueba("utilidad bruta y neta de la fonda", () => {
  esperar(C.utilidadBruta(fonda.ventas, fonda.costoVentas) === 36000);
  esperar(C.utilidadNeta(fonda.ventas, fonda.costoVentas, fonda.gastos) === 12000);
});
prueba("margen bruto 60 %, neto 20 %", () => {
  esperar(casi(C.margenBruto(fonda.ventas, fonda.costoVentas), 0.6));
  esperar(casi(C.margenNeto(fonda.ventas, fonda.costoVentas, fonda.gastos), 0.2));
});
prueba("margen con ventas 0 no divide entre cero", () => {
  esperar(C.margenBruto(0, 100) === 0 && C.margenNeto(0, 0, 500) === 0);
});

// --- punto de equilibrio
prueba("punto de equilibrio = gastos / margen bruto", () => {
  esperar(casi(C.puntoEquilibrio(fonda.gastos, 0.6), 40000));
});
prueba("sin margen no hay equilibrio (Infinity); sin gastos es 0", () => {
  esperar(C.puntoEquilibrio(10000, 0) === Infinity && C.puntoEquilibrio(10000, -0.2) === Infinity);
  esperar(C.puntoEquilibrio(0, 0.5) === 0);
});
prueba("cobertura 1.5 cuando vendes 60k y el PE es 40k", () => {
  esperar(casi(C.cobertura(60000, 40000), 1.5));
  esperar(C.cobertura(1000, Infinity) === 0);
});

// --- días de caja
prueba("días de caja = caja / salida diaria", () => {
  // salida mensual 24000 + 24000 = 48000 → 1600 por día → 20000 / 1600 = 12.5 días
  esperar(casi(C.diasCaja(20000, fonda.gastos, fonda.costoVentas), 12.5));
  esperar(C.diasCaja(5000, 0, 0) === Infinity);
});

// --- rentabilidad por producto
prueba("ordena productos por contribución y marca el que pierde", () => {
  const r = C.rentabilidadProductos([
    { nombre: "Comida corrida", precio: 90, costo: 40, unidades: 400 },
    { nombre: "Refresco", precio: 25, costo: 15, unidades: 300 },
    { nombre: "Postre", precio: 30, costo: 35, unidades: 50 },
    { nombre: "", precio: 1, costo: 1, unidades: 1 },
  ]);
  esperar(r.length === 3, "ignora filas sin nombre");
  esperar(r[0].nombre === "Comida corrida" && r[0].contribucion === 20000);
  esperar(r[2].nombre === "Postre" && r[2].margenUnit === -5 && r[2].color === "rojo");
  esperar(casi(r[0].participacion, 20000 / 23000, 0.001));
});

// --- semáforo
prueba("semáforo verde/amarillo/rojo con umbrales por defecto", () => {
  esperar(C.semaforo(0.35, UMBRALES.margenBruto) === "verde");
  esperar(C.semaforo(0.25, UMBRALES.margenBruto) === "amarillo");
  esperar(C.semaforo(0.10, UMBRALES.margenBruto) === "rojo");
  esperar(C.semaforo(Infinity, UMBRALES.diasCaja) === "verde");
});
prueba("semáforo respeta umbrales personalizados", () => {
  esperar(C.semaforo(0.25, { verde: 0.20, amarillo: 0.10 }) === "verde");
  esperar(C.semaforo(5, { verde: 2, amarillo: 4, mayorEsPeor: true }) === "rojo");
});

// --- resultadosMes y recomendación
prueba("resultadosMes junta todo y da frases", () => {
  const r = C.resultadosMes(fonda);
  esperar(r.utilidadNeta === 12000 && casi(r.puntoEquilibrio, 40000) && r.semaforo.margenNeto === "verde");
  esperar(r.frases.utilidad.includes("$12,000"), "frase de utilidad con el monto");
  esperar(r.frases.equilibrio.includes("$40,000"), "frase de equilibrio con el PE");
  esperar(r.semaforo.diasCaja === "rojo", "12.5 días es rojo");
  esperar(r.recomendacion.includes("caja"), "recomienda sobre caja: " + r.recomendacion);
});
prueba("recomendación cuando se pierde dinero", () => {
  const r = C.resultadosMes({ ventas: 30000, costoVentas: 15000, gastos: 20000, caja: 50000 });
  esperar(r.utilidadNeta === -5000 && r.recomendacion.includes("perdiendo"), r.recomendacion);
  esperar(r.recomendacion.includes("$10,000"), "faltante de ventas = PE 40k - 30k");
});
prueba("recomendación por margen bruto rojo va primero", () => {
  const r = C.resultadosMes({ ventas: 10000, costoVentas: 9000, gastos: 500, caja: 100000 });
  esperar(r.recomendacion.includes("margen bruto"), r.recomendacion);
});
prueba("recomendación por producto que pierde", () => {
  const r = C.resultadosMes({ ventas: 100000, costoVentas: 40000, gastos: 20000, caja: 200000,
    productos: [{ nombre: "Caja regalo", precio: 100, costo: 120, unidades: 10 }, { nombre: "Playera", precio: 300, costo: 120, unidades: 200 }] });
  esperar(r.recomendacion.includes("Caja regalo"), r.recomendacion);
});
prueba("sin ventas pide capturar", () => {
  esperar(C.resultadosMes({ ventas: 0, costoVentas: 0, gastos: 0, caja: 0 }).recomendacion.includes("Captura"));
});

// --- historial y validación
prueba("historial ordena meses y pasa el anterior", () => {
  const h = C.historial({ "2026-03": fonda, "2026-01": fonda, "2026-02": { ...fonda, ventas: 40000 }, basura: {} });
  esperar(h.length === 3 && h[0].clave === "2026-01" && h[2].clave === "2026-03");
});
prueba("validarMes detecta vacíos y negativos", () => {
  esperar(C.validarMes({ ventas: "", costoVentas: "10" }).some((e) => e.includes("ventas")));
  esperar(C.validarMes({ ventas: "100", costoVentas: "-3" }).length === 1);
  esperar(C.validarMes({ ventas: "100", costoVentas: "50", caja: "10", gastos: { renta: "5" } }).length === 0);
  esperar(C.validarMes({ ventas: "100", productos: [{ nombre: "", precio: "5" }] }, "avanzado").some((e) => e.includes("nombre")));
});
prueba("avisosMes avisa costo > ventas y gastos en 0", () => {
  esperar(C.avisosMes({ ventas: 100, costoVentas: 150, gastos: 0 }).length === 2);
});

// --- gastos con categorías libres
prueba("totalGastos suma cualquier categoría", () => {
  esperar(C.totalGastos({ renta: 5000, "publicidad-2": 800, luz: "200" }) === 6000);
  esperar(C.listaCategorias(null).map((c) => c.id).join(",") === "renta,sueldos,servicios,otros", "categorías base");
  esperar(C.listaCategorias({ b: { nombre: "B", orden: 2 }, a: { nombre: "A", orden: 1 } })[0].id === "a", "respeta orden");
  esperar(C.idCategoria("Gasolina", { gasolina: 1 }) === "gasolina-2", "no repite ids");
});

// --- diario → mes
const dias = {
  "2026-10-01": { ventas: 1800, compras: 700, gastos: { renta: 8000 } },
  "2026-10-02": { ventas: 2200, compras: 900, gastos: { luz: 350, renta: 0 } },
  "2026-10-15": { ventas: 1500, compras: 0, gastos: {} },
  "2026-09-30": { ventas: 9999, compras: 9999 },
};
prueba("resumenDias suma solo los días del mes", () => {
  const r = C.resumenDias(dias, "2026-10");
  esperar(r.n === 3 && r.ventas === 5500 && r.costoVentas === 1600, "ventas y compras");
  esperar(r.gastos.renta === 8000 && r.gastos.luz === 350 && !("otros" in r.gastos), "gastos por categoría, sin ceros");
  esperar(C.resumenDias(dias, "2026-08").n === 0, "mes vacío");
});
prueba("validarDia pide fecha y al menos un número", () => {
  esperar(C.validarDia({ fecha: "", ventas: "10" }).some((e) => e.includes("fecha")));
  esperar(C.validarDia({ fecha: "2026-10-01", ventas: "", compras: "" }).length === 1);
  esperar(C.validarDia({ fecha: "2026-10-01", ventas: "-1" }).length === 1);
  esperar(C.validarDia({ fecha: "2026-10-01", ventas: "100" }).length === 0);
});

// --- modo empresa
const emp = { ventas: 300000, costoVentas: 180000, gastos: { renta: 20000, sueldos: 50000 }, caja: 40000,
  empresa: { depreciacion: 5000, intereses: 4000, impuestos: 9000, cuentasPorCobrar: 60000, inventario: 90000, otrosActivosCirc: 10000, activoFijo: 300000,
    cuentasPorPagar: 45000, deudaCortoPlazo: 35000, deudaLargoPlazo: 120000, capex: 20000, prestamosRecibidos: 0, pagosDeuda: 6000, aportaciones: 0, retiros: 10000 } };
prueba("estado de resultados: de la utilidad bruta a la neta", () => {
  const r = C.resultadosEmpresa(emp).resultados;
  esperar(r.utilidadBruta === 120000 && r.ebitda === 50000 && r.utilidadOperativa === 45000, "bruta, EBITDA, operativa");
  esperar(r.uai === 41000 && r.utilidadNeta === 32000, "antes y después de impuestos");
});
prueba("balance: activos, pasivos y capital cuadran", () => {
  const b = C.resultadosEmpresa(emp).balance;
  esperar(b.activoCirc === 200000 && b.activoTotal === 500000, "activo");
  esperar(b.pasivoCirc === 80000 && b.pasivoTotal === 200000 && b.capital === 300000, "pasivo y capital");
});
prueba("razones: circulante, ácido, días y apalancamiento", () => {
  const { razones: z, semaforo: s } = C.resultadosEmpresa(emp);
  esperar(casi(z.razonCirculante, 2.5) && casi(z.pruebaAcido, 1.375, 0.001), "circulante 2.5 y ácido 1.375");
  esperar(casi(z.diasInventario, 15) && casi(z.diasCobro, 6) && casi(z.diasPago, 7.5), "días inv/cobro/pago");
  esperar(casi(z.cicloEfectivo, 13.5), "ciclo = 15 + 6 − 7.5");
  esperar(casi(z.apalancamiento, 0.4) && casi(z.coberturaIntereses, 11.25), "apalancamiento 40 %, cobertura 11.25x");
  esperar(casi(z.rotacionInventario, 24) && casi(z.roa, 0.768, 0.001) && casi(z.roe, 1.28, 0.001), "rotación anual, ROA, ROE");
  esperar(s.razonCirculante === "verde" && s.pruebaAcido === "verde" && s.apalancamiento === "verde", "semáforos verdes");
});
prueba("razones en rojo cuando aprieta", () => {
  const malo = { ...emp, empresa: { ...emp.empresa, inventario: 400000, cuentasPorCobrar: 700000, deudaCortoPlazo: 1500000, intereses: 50000 } };
  const { semaforo: s } = C.resultadosEmpresa(malo);
  esperar(s.pruebaAcido === "rojo" && s.diasInventario === "amarillo" && s.diasCobro === "rojo" && s.coberturaIntereses === "rojo", JSON.stringify(s));
});
prueba("flujo de efectivo indirecto cuadra con la caja", () => {
  const anterior = { ...emp, caja: 30000, empresa: { ...emp.empresa, cuentasPorCobrar: 50000, inventario: 100000, cuentasPorPagar: 40000 } };
  const f = C.resultadosEmpresa({ ...emp, anterior }).flujo;
  // operativo = 32000 + 5000 − 10000 (más por cobrar) + 10000 (menos inventario) + 5000 (más proveedores) = 42000
  esperar(f.operativo === 42000, "operativo " + f.operativo);
  esperar(f.inversion === -20000 && f.financiamiento === -16000 && f.neto === 6000, "inversión, financiamiento y neto");
  esperar(f.cajaFinalCalculada === 36000 && f.diferencia === 4000, "caja calculada 36000 vs real 40000");
  esperar(C.resultadosEmpresa(emp).flujo.conAnterior === false, "sin anterior no hay deltas");
});
prueba("sin deudas ni inventario las razones no explotan", () => {
  const r = C.resultadosEmpresa({ ventas: 1000, costoVentas: 400, gastos: {}, caja: 500, empresa: {} });
  esperar(r.razones.razonCirculante === Infinity && r.semaforo.razonCirculante === "verde", "sin pasivo = Infinity y verde");
  esperar(r.razones.diasInventario === 0 && r.razones.cicloEfectivo === 0 && r.balance.capital === 500);
  esperar(r.notas.length === 1, "solo la nota de primer mes");
});
prueba("validarMes revisa campos de empresa y categorías libres", () => {
  esperar(C.validarMes({ ventas: "100", gastos: { gasolina: "-5" } }).length === 1);
  esperar(C.validarMes({ ventas: "100", empresa: { inventario: "abc" } }, "empresa").some((e) => e.includes("Inventario")));
});

// --- correr
export function correr(reportar = console.log) {
  let ok = 0, mal = 0;
  for (const c of casos) {
    try { c.fn(); ok++; reportar(`✓ ${c.nombre}`, true); }
    catch (e) { mal++; reportar(`✗ ${c.nombre} → ${e.message}`, false); }
  }
  reportar(`${ok} correctas, ${mal} fallidas`, mal === 0);
  return mal === 0;
}
if (typeof window === "undefined") { const ok = correr(); if (typeof process !== "undefined") process.exitCode = ok ? 0 : 1; }
