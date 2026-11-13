// Umbrales del semáforo. Cambia aquí los números y toda la app los usa.
// Cada indicador tiene "verde" y "amarillo"; por debajo de amarillo es rojo
// (o por arriba, cuando "mayorEsPeor" es true).
//
// ¿De dónde salen los valores por defecto?
// - margenBruto: en comercio minorista y comida en México el margen bruto típico
//   ronda 30-50 %. Debajo de 20 % casi nunca alcanza para cubrir gastos fijos.
// - margenNeto: para una pyme, 10 % o más ya es sano; entre 3 % y 10 % es "vive al día";
//   menos de 3 % (o negativo) es señal de alerta.
// - cobertura (ventas / punto de equilibrio): 1.0 es apenas no perder. Pedimos 1.15
//   (15 % de colchón) para verde; entre 1.0 y 1.15 amarillo; debajo de 1.0 pierdes.
// - diasCaja: la regla práctica de tesorería para negocios chicos es 30 días de gastos
//   en caja (un mes de "aire"); 15 días es el mínimo para no tener sustos de quincena.
// - productoMargen: margen de contribución por producto; igual que el bruto,
//   pero un poco más exigente porque es por unidad y sin diluir.
export const UMBRALES = {
  margenBruto: { verde: 0.30, amarillo: 0.20, mayorEsPeor: false },
  margenNeto: { verde: 0.10, amarillo: 0.03, mayorEsPeor: false },
  cobertura: { verde: 1.15, amarillo: 1.00, mayorEsPeor: false },
  diasCaja: { verde: 30, amarillo: 15, mayorEsPeor: false },
  productoMargen: { verde: 0.35, amarillo: 0.20, mayorEsPeor: false },
};

// ---------- Modo Empresa ----------
// Reglas prácticas de análisis financiero (las que se enseñan en cualquier curso de
// finanzas corporativas y usan los bancos al evaluar crédito a pymes). Son generales:
// un supermercado rota inventario mucho más rápido que una mueblería, así que tómalos
// como referencia, no como ley. "mayorEsPeor" = entre más alto, peor (días, deuda).
// - razonCirculante (activo circulante / pasivo circulante): 1.5 o más es cómodo;
//   entre 1.0 y 1.5 vas justo; debajo de 1.0 no alcanzas a pagar lo que debes a corto plazo.
// - pruebaAcido (lo mismo pero sin contar inventario): 1.0 o más es sano; 0.7 aceptable
//   si vendes rápido; menos significa que dependes de vender inventario para pagar.
// - diasInventario (cuánto tarda en venderse lo que tienes): 45 días o menos para comercio
//   y comida; hasta 90 tolerable; más es dinero dormido en el almacén.
// - diasCobro (cuánto tardan en pagarte): 30 o menos es sano; 60 ya aprieta la caja.
// - cicloEfectivo (días inventario + días cobro − días pago): cuántos días financias tú
//   la operación. 30 o menos es bueno; 60 tolerable; más exige mucho capital de trabajo.
// - apalancamiento (pasivo total / activo total): hasta 50 % es prudente; hasta 70 % alto
//   pero manejable; más de 70 % el negocio es de los acreedores.
// - coberturaIntereses (utilidad de operación / intereses): 3 veces o más es cómodo;
//   1.5 a 3 ajustado; menos de 1.5 los intereses se comen la utilidad.
export const UMBRALES_EMPRESA = {
  razonCirculante: { verde: 1.5, amarillo: 1.0, mayorEsPeor: false },
  pruebaAcido: { verde: 1.0, amarillo: 0.7, mayorEsPeor: false },
  diasInventario: { verde: 45, amarillo: 90, mayorEsPeor: true },
  diasCobro: { verde: 30, amarillo: 60, mayorEsPeor: true },
  cicloEfectivo: { verde: 30, amarillo: 60, mayorEsPeor: true },
  apalancamiento: { verde: 0.5, amarillo: 0.7, mayorEsPeor: true },
  coberturaIntereses: { verde: 3, amarillo: 1.5, mayorEsPeor: false },
};
