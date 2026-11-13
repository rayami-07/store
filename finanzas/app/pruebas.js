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
