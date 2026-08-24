// Motor de cálculo — paridad Excel + modo Pro
// Refs: Excel B28-B33 + Guía paso 3/4

export type Servicio = 'Conservación' | 'Enfriamiento' | 'Congelado'
export type Gas = 'R22' | 'R404A' | 'R448A' | 'R449A' | 'R290'
export type Aperturas = 'Baja' | 'Media' | 'Alta'
export type Iluminacion = 'LED' | 'Fluorescente' | 'Otra'

export interface CamaraInput {
  largo: number | null
  ancho: number | null
  alto: number | null
  tempInterior: number | null // from Lista -30..10
  tempExterior: number | null // 30..50
  espesor: number | null // 40..150
  pisoAislado: boolean
  servicio: Servicio
  gas: Gas
  // Pro opcionales
  producto?: string
  cantidadTotal?: number | null
  ingresoKgDia?: number | null
  tempIngreso?: number | null
  tempFinal?: number | null
  tiempoHoras?: number | null // default 24
  puertaAncho?: number | null
  puertaAlto?: number | null
  aperturas?: Aperturas
  personas?: number | null
  horasTrabajo?: number | null
  iluminacion?: Iluminacion
}

export interface CalcResult {
  volumen: number | null
  superficie: number | null
  factorServicio: number
  hpBase: number | null
  hpRecomendado: number | null
  hpPro: number | null // si hay datos pro, estimado ajustado
  hpFinal: number | null // el que se muestra como recomendado (max entre base y pro snap)
  gas: Gas
  estado: 'COMPLETAR_DATOS' | 'OK'
  // Detalles pro
  qTransmision: number | null // kcal/h
  qProducto: number | null
  qInfiltracion: number | null
  qPersonas: number | null
  qIluminacion: number | null
  qTotal: number | null
  // Paneles
  paneles: PanelesResult | null
  // Equipos
  condensadora: string | null
  evaporadora: string | null
  valvula: string | null
  tobera: string | null
}

export interface PanelesResult {
  espesor: number
  tipo: string
  m2Muros: number
  m2Techo: number
  m2Piso: number
  m2Total: number
  cantPanelesMuro: number
  cantPanelesTecho: number
  cantPanelesPiso: number
  cantTotal: number
}

const HP_CATALOGO = [0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 7.5, 10] as const

export function snapHP(hp: number): number {
  for (const v of HP_CATALOGO) if (hp <= v) return v
  return 10 // cap
}

export function factorServicio(s: Servicio): number {
  if (s === 'Conservación') return 1
  if (s === 'Enfriamiento') return 1.35
  return 1.8
}

export function gasDefault(tempInterior: number | null): Gas {
  if (tempInterior === null) return 'R22'
  return tempInterior >= 0 ? 'R22' : 'R404A'
}

export function espesorRecomendado(tempInterior: number | null): number {
  if (tempInterior === null) return 60
  return tempInterior >= 0 ? 60 : 100
}

// U = k / e ; k PU ~0.022 W/mK
function uValue(espesorMm: number): number {
  const e = espesorMm / 1000
  const k = 0.022
  return k / e // W/m2K
}

function toKcalH(watts: number): number {
  return watts * 0.85984
}

export function calcPaneles(input: CamaraInput, superficie: number | null): PanelesResult | null {
  const { largo, ancho, alto, espesor, tempInterior, pisoAislado } = input
  if (largo == null || ancho == null || alto == null || superficie == null) return null
  const esp = espesor ?? espesorRecomendado(tempInterior)
  const anchoPanel = 1.16 // m
  const altoPanelStd = alto // panel a medida, simplificamos 1 panel = alto completo

  // Muros: perímetro * alto / anchoPanel
  // techo y piso: largo*ancho / (anchoPanel*1m?) but panel techo also 1.16 ancho
  // Simplificado: m2 / (anchoPanel * 1m) no es real; mejor directo por m2 y cant = ceil(m2 / (anchoPanel * largoPanelStd?) 
  // Para v1: cant = ceil(m2 / 2.8) approx 1.16*2.9? No. Usaremos método perímetro.
  const perimetro = 2 * (largo + ancho)
  const m2Muros = perimetro * alto
  const m2Techo = largo * ancho
  const m2Piso = pisoAislado ? largo * ancho : 0
  const m2Total = m2Muros + m2Techo + m2Piso

  // Cant paneles: muros = ceil(perimetro / anchoPanel)  (cada panel cubre alto completo)
  // techo/piso = ceil(largo/ anchoPanel) * ceil(ancho / longPanel?) panel techo típico 1.16 x (hasta 6m). Simplificamos: ceil(ancho/1.16)* ceil(largo/1) ??? 
  // Aproximación: área panel estándar 3.36 m2 (1.16*2.9). Mejor usar m2 /2.8 como proxy y ceil.
  const cantPanelesMuro = Math.ceil(perimetro / anchoPanel)
  // Para techo/piso: cantidad = ceil(largo/anchoPanel)* ceil(ancho/1)?? Usamos m2 / (1.16* largoPanel?) Largo panel techo = largo o ancho según orientación. Aproximamos por m2 / 2.9
  const areaPanelRef = 1.16 * 2.95 // ~3.42
  void areaPanelRef; void altoPanelStd
  const cantPanelesTecho = Math.ceil(m2Techo / 3.0) // heuristic 1 panel ~3m2
  const cantPanelesPiso = pisoAislado ? Math.ceil(m2Piso / 3.0) : 0
  const cantTotal = cantPanelesMuro + cantPanelesTecho + cantPanelesPiso

  return {
    espesor: esp,
    tipo: esp >= 100 ? 'Panel PU 100mm (baja)' : esp >= 80 ? `Panel PU ${esp}mm` : 'Panel PU 60mm (media)',
    m2Muros: round2(m2Muros),
    m2Techo: round2(m2Techo),
    m2Piso: round2(m2Piso),
    m2Total: round2(m2Total),
    cantPanelesMuro,
    cantPanelesTecho,
    cantPanelesPiso,
    cantTotal,
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }

export function calc(input: CamaraInput): CalcResult {
  const { largo, ancho, alto, tempInterior, tempExterior, servicio, gas, espesor } = input
  const hasDims = largo != null && ancho != null && alto != null && largo > 0 && ancho > 0 && alto > 0
  const volumen = hasDims ? round2(largo! * ancho! * alto!) : null
  const superficie = hasDims ? round2(2 * (largo! * ancho! + largo! * alto! + ancho! * alto!)) : null
  const f = factorServicio(servicio)

  let hpBase: number | null = null
  let hpRecomendado: number | null = null
  let estado: CalcResult['estado'] = 'COMPLETAR_DATOS'

  if (volumen != null && tempInterior != null) {
    hpBase = tempInterior >= 0 ? (volumen / 12) * f : (volumen / 6) * f
    hpBase = round2(hpBase)
    hpRecomendado = snapHP(hpBase)
    estado = 'OK'
  }

  // Pro: calcular cargas si hay datos opcionales relevantes
  let qTransmision: number | null = null
  let qProducto: number | null = null
  let qInfiltracion: number | null = null
  let qPersonas: number | null = null
  let qIluminacion: number | null = null
  let qTotal: number | null = null
  let hpPro: number | null = null

  const hasProData = (input.ingresoKgDia != null && input.ingresoKgDia > 0) || (input.puertaAncho != null && input.puertaAlto != null) || (input.personas != null && input.personas > 0) || (input.iluminacion != null)

  if (volumen != null && superficie != null && tempInterior != null && tempExterior != null && hasDims) {
    // Q transmisión
    const esp = espesor ?? espesorRecomendado(tempInterior)
    const U = uValue(esp)
    const dT = tempExterior - tempInterior
    const supEfectiva = superficie - (input.pisoAislado ? 0 : largo! * ancho!) // si piso no aislado, no cuenta? simplificamos mantiene sup total para ser conservador
    void supEfectiva
    const wTransm = U * superficie * dT // W
    qTransmision = round2(toKcalH(wTransm))

    // Q producto
    if (input.ingresoKgDia != null && input.ingresoKgDia > 0 && input.tempIngreso != null && input.tempFinal != null) {
      const m = input.ingresoKgDia
      const cp = tempInterior < 0 ? 0.45 : 0.9 // kcal/kgC aprox congelado vs refrigerado
      const dTprod = Math.abs(input.tempIngreso - input.tempFinal)
      let energia = m * cp * dTprod // kcal
      // latente si cruza 0 y va a congelado
      if (tempInterior < 0 && input.tempIngreso > 0 && (input.tempFinal ?? tempInterior) <= 0) {
        energia += m * 60 // 60-80 kcal/kg latente, usamos 60 conservador
      }
      const tiempo = input.tiempoHoras ?? 24
      qProducto = round2(energia / tiempo)
    } else {
      qProducto = 0
    }

    // Q infiltración puerta
    if (input.puertaAncho != null && input.puertaAlto != null && input.aperturas) {
      const areaPuerta = input.puertaAncho * input.puertaAlto
      const achMap: Record<Aperturas, number> = { Baja: 0.8, Media: 1.8, Alta: 3.5 }
      const ach = achMap[input.aperturas] ?? 1.8
      // ref: Q ~ V * ACH * dH ; dH ~ 0.31*dT kcal/m3 ; + humedad
      const vol = volumen!
      // simplificado: kcal/h = vol*ACH* dT *0.31 * factor humedad 1.2
      const qAir = vol * ach * dT * 0.31 * 1.15
      // ajustar por área puerta vs volumen pequeña corrección
      void areaPuerta
      qInfiltracion = round2(qAir)
    } else {
      qInfiltracion = 0
    }

    // Q personas: 200 kcal/h por persona activa, promediado en 24h según horasTrabajo
    if (input.personas != null && input.personas > 0) {
      const hrs = input.horasTrabajo ?? 2
      const q = input.personas * 200 * (hrs / 24) * 1.5 // factor actividad
      qPersonas = round2(q)
    } else qPersonas = 0

    // Q iluminación
    if (input.iluminacion) {
      const wPerM2 = input.iluminacion === 'LED' ? 8 : input.iluminacion === 'Fluorescente' ? 15 : 12
      const m2 = largo! * ancho!
      const hrs = input.horasTrabajo ?? 8
      const w = m2 * wPerM2
      qIluminacion = round2(toKcalH(w) * (hrs / 24))
    } else qIluminacion = 0

    qTotal = round2((qTransmision ?? 0) + (qProducto ?? 0) + (qInfiltracion ?? 0) + (qPersonas ?? 0) + (qIluminacion ?? 0))

    // Convertir Q adicional a HP adicional sobre el rápido
    // Si hay datos pro, calculamos HP_pro como HP rápido + (Q_prod+Q_air+Q_personas+Q_luz)/coef
    // coef 1 HP ~ 2200 kcal/h MT, 1100 BT (más conservador)
    const coef = tempInterior >= 0 ? 2200 : 1100
    const qAdicional = (qProducto ?? 0) + (qInfiltracion ?? 0) + (qPersonas ?? 0) + (qIluminacion ?? 0)
    // Solo si hay datos pro significativos, sumar. Si no, hpPro = null
    if (hasProData && hpBase != null) {
      const hpAdd = qAdicional / coef
      hpPro = round2(hpBase + hpAdd)
      // también alternativa por Q total puro
      const hpPorQTotal = qTotal! / coef
      // tomar max para no subdimensionar
      hpPro = round2(Math.max(hpPro, hpPorQTotal))
    }
  }

  let hpFinal: number | null = hpRecomendado
  if (hpPro != null && hpRecomendado != null) {
    const snapPro = snapHP(hpPro)
    hpFinal = Math.max(hpRecomendado, snapPro)
  }

  const gasSel = gas ?? gasDefault(tempInterior)

  // Paneles
  const paneles = calcPaneles(input, superficie)

  // Equipos genéricos
  let condensadora: string | null = null
  let evaporadora: string | null = null
  let valvula: string | null = null
  let tobera: string | null = null
  if (hpFinal != null && tempInterior != null) {
    const mt = tempInterior >= 0
    const pref = mt ? 'MT' : 'BT'
    condensadora = `Unidad condensadora ${hpFinal} HP ${pref} — ${gasSel} (genérica)`
    // evaporadora: split si >2
    if (hpFinal <= 2) evaporadora = `Evaporador ${pref} ${hpFinal} HP (1x) — ${gasSel}`
    else if (hpFinal <= 5) {
      const n = hpFinal <= 3 ? 1 : 2
      const per = round2(hpFinal / n)
      evaporadora = `${n}x Evaporador ${pref} ${per} HP — ${gasSel} (total ${hpFinal} HP)`
    } else {
      evaporadora = `2x Evaporador ${pref} ${round2(hpFinal / 2)} HP — ${gasSel} (total ${hpFinal} HP)`
    }

    // Válvula: mapeo HP -> tobera
    const toberaMap: [number, string][] = [
      [0.5, '00'], [0.75, '0'], [1, '01'], [1.5, '01'], [2, '02'], [3, '03'], [4, '04'], [5, '05'], [7.5, '06'], [10, '07']
    ]
    let tob = '02'
    for (const [hp, t] of toberaMap) if (hpFinal <= hp) { tob = t; break }
    // si HP grande, max
    if (hpFinal > 10) tob = '07'
    tobera = `Tobera nº ${tob}`

    const valvMap: Record<Gas, string> = {
      R22: 'Danfoss TES2 / T2 — R22',
      R404A: 'Danfoss TES2 / Copeland — R404A',
      R448A: 'Danfoss TES2 — R448A',
      R449A: 'Danfoss TES2 — R449A',
      R290: 'Danfoss T2 / TU — R290 (requiere equipo certificado)'
    }
    valvula = valvMap[gasSel] ?? 'Danfoss TES2 — genérica'
  }

  return {
    volumen, superficie, factorServicio: f,
    hpBase, hpRecomendado, hpPro, hpFinal,
    gas: gasSel, estado,
    qTransmision, qProducto, qInfiltracion, qPersonas, qIluminacion, qTotal,
    paneles, condensadora, evaporadora, valvula, tobera
  }
}
