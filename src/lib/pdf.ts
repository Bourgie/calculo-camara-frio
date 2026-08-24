import jsPDF from 'jspdf'
import type { CalcResult, CamaraInput } from './calc'

export function generarPDF(opts: {
  cliente: string
  tel?: string
  ciudad?: string
  vendedor?: string
  notas?: string
  input: CamaraInput
  result: CalcResult
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { cliente, tel, ciudad, vendedor, notas, input, result } = opts
  const fecha = new Date().toLocaleDateString('es-AR')

  // Header
  doc.setFillColor(14, 116, 144)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('CÁLCULO CÁMARA DE FRÍO', 14, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Estimado orientativo — verificar con cálculo de carga térmica y capacidad del fabricante', 14, 20)
  doc.setFontSize(7)
  doc.text(`Fecha: ${fecha}`, 150, 14)
  if (vendedor) doc.text(`Vendedor: ${vendedor}`, 150, 18)

  // Cliente
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Cliente', 14, 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let y = 41
  doc.text(`Nombre: ${cliente || '-'}`, 14, y); y += 5
  if (tel) { doc.text(`Tel: ${tel}`, 14, y); y += 5 }
  if (ciudad) { doc.text(`Ciudad/Zona: ${ciudad}`, 14, y); y += 5 }
  if (notas) { doc.text(`Notas: ${notas}`, 14, y, { maxWidth: 180 }); y += 7 }

  // Datos cámara
  y += 2
  doc.setFont('helvetica', 'bold')
  doc.text('Datos de cámara', 14, y); y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const dims = `${input.largo ?? '-'} x ${input.ancho ?? '-'} x ${input.alto ?? '-'} m`
  const line = (label: string, value: string) => { doc.text(`${label}: ${value}`, 14, y); y += 4 }
  line('Dimensiones (LxAxH)', dims)
  line('Volumen / Superficie', `${result.volumen ?? '-'} m³  /  ${result.superficie ?? '-'} m²`)
  line('Temp interior / exterior', `${input.tempInterior ?? '-'} °C  /  ${input.tempExterior ?? '-'} °C`)
  line('Servicio / Factor', `${input.servicio}  (x${result.factorServicio})`)
  line('Aislación', `Panel PU ${input.espesor ?? '-'} mm  |  Piso aislado: ${input.pisoAislado ? 'Sí' : 'No'}`)
  line('Refrigerante', `${result.gas}`)
  if (input.puertaAncho || input.aperturas) line('Puerta / Aperturas', `${input.puertaAncho ?? '-'}x${input.puertaAlto ?? '-'} m  |  ${input.aperturas ?? '-'}`)
  if (input.ingresoKgDia) line('Producto / Ingreso', `${input.producto ?? '-'}  |  ${input.ingresoKgDia} kg/día  (${input.tempIngreso ?? '-'} → ${input.tempFinal ?? '-'} °C en ${input.tiempoHoras ?? 24}h)`)
  if (input.personas) line('Personas / Iluminación', `${input.personas} pers.  ${input.horasTrabajo ?? 0} h/día  |  ${input.iluminacion ?? '-'}`)

  // Resultado destacado
  y += 4
  doc.setFillColor(240, 253, 250)
  doc.setDrawColor(14, 116, 144)
  doc.rect(14, y, 182, 28, 'FD')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(14, 116, 144)
  doc.text(`HP RECOMENDADO: ${result.hpFinal ?? '-'} HP nominal`, 18, y + 8)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  const hpDetalle = result.hpPro != null && result.hpPro !== result.hpBase
    ? `Base a ojo: ${result.hpBase} HP → Ajustado: ${result.hpPro} HP → Snap: ${result.hpFinal} HP`
    : `Base: ${result.hpBase ?? '-'} HP → Snap catálogo: ${result.hpFinal ?? '-'} HP`
  doc.text(hpDetalle, 18, y + 13)
  doc.text(`Estado: ${result.estado === 'OK' ? 'RESULTADO PRELIMINAR — VERIFICAR CARGA TÉRMICA' : 'COMPLETAR DATOS BÁSICOS'}`, 18, y + 18)
  doc.text('Volumen/12 (MT) o /6 (BT) x factor servicio — regla Excel validada', 18, y + 22)

  y += 34
  // Equipos
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Estimación de equipos', 14, y); y += 6
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const addEquip = (title: string, value: string | null) => {
    if (!value) return
    doc.setFont('helvetica', 'bold'); doc.text(`${title}:`, 14, y)
    doc.setFont('helvetica', 'normal'); doc.text(value, 38, y, { maxWidth: 158 }); y += 5
  }
  addEquip('Condensadora', result.condensadora)
  addEquip('Evaporadora', result.evaporadora)
  addEquip('Válvula', result.valvula)
  addEquip('Tobera', result.tobera)
  if (result.paneles) {
    const p = result.paneles
    addEquip('Paneles', `${p.tipo} — ${p.m2Total} m² | Muros ${p.m2Muros} + Techo ${p.m2Techo}${p.m2Piso ? ` + Piso ${p.m2Piso}` : ''} | ~${p.cantTotal} paneles (muro ${p.cantPanelesMuro} + techo ${p.cantPanelesTecho}${p.m2Piso ? ` + piso ${p.cantPanelesPiso}` : ''})`)
  }
  if (result.qTotal != null && result.qTotal > 0) {
    y += 2
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(`Desglose térmico Pro (kcal/h): Transm. ${result.qTransmision} + Prod. ${result.qProducto} + Infilt. ${result.qInfiltracion} + Pers. ${result.qPersonas} + Luz ${result.qIluminacion} = ${result.qTotal}`, 14, y, { maxWidth: 182 })
    y += 4
  }

  // Footer
  doc.setFontSize(6)
  doc.setTextColor(130, 130, 130)
  doc.text('Predimensionamiento orientativo. La selección definitiva debe hacerse con carga térmica completa y capacidad frigorífica del fabricante a Tevap/Tcond reales. R290 requiere equipos certificados.', 14, 285, { maxWidth: 182 })
  doc.text('Generado por Cálculo Cámara de Frío — PWA offline', 14, 290)

  doc.save(`Camara-${(cliente || 'cliente').replace(/\s+/g, '_')}-${fecha.replace(/\//g, '-')}.pdf`)
}
