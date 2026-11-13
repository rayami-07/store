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
