import { useEffect, useMemo, useState } from 'react'
import { calc, espesorRecomendado, gasDefault, type Aperturas, type CamaraInput, type Gas, type Iluminacion, type Servicio } from './lib/calc'
import { generarPDF } from './lib/pdf'
import { getHistorial, getVendedor, pushHistorial, setVendedor as setVendedorLS } from './lib/storage'
import { APP_INFO, DEV_INFO } from './config'

const TEMP_INT_OPTS = [-30, -25, -20, -18, -15, -10, -5, 0, 2, 4, 5, 8, 10]
const TEMP_EXT_OPTS = [30, 35, 40, 45, 50]
const ESPESOR_OPTS = [40, 50, 60, 80, 100, 120, 150]
const SERVICIOS: Servicio[] = ['Conservación', 'Enfriamiento', 'Congelado']
const GASES: Gas[] = ['R22', 'R404A', 'R448A', 'R449A', 'R290']
const PRODUCTOS = ['Carne refrigerada','Carne congelada','Pollo refrigerado','Pollo congelado','Lácteos','Frutas y verduras','Bebidas','Helados','Pescado','Producto general','Otro']
const APERTURAS: Aperturas[] = ['Baja','Media','Alta']
const ILUMS: Iluminacion[] = ['LED','Fluorescente','Otra']

function FieldLabel({ children, req }: { children: string, req?: boolean }) {
  return <label className="text-[13px] font-medium text-slate-700">{children}{req && <span className="text-red-500"> *</span>}</label>
}

export default function App() {
  // Cliente
  const [cliente, setCliente] = useState('')
  const [tel, setTel] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [vendedor, setVendedorState] = useState(() => getVendedor())
  const [notas, setNotas] = useState('')

  // Cámara
  const [largo, setLargo] = useState<string>('')
  const [ancho, setAncho] = useState<string>('')
  const [alto, setAlto] = useState<string>('')
  const [tempInt, setTempInt] = useState<number | null>(null)
  const [tempExt, setTempExt] = useState<number | null>(null)
  const [servicio, setServicio] = useState<Servicio>('Conservación')
  const [gas, setGas] = useState<Gas>('R22')
  const [espesor, setEspesor] = useState<number | null>(null)
  const [pisoAislado, setPisoAislado] = useState(true)

  // Pro
  const [showPro, setShowPro] = useState(false)
  const [producto, setProducto] = useState<string>('Producto general')
  const [cantidadTotal, setCantidadTotal] = useState<string>('')
  const [ingresoKgDia, setIngresoKgDia] = useState<string>('')
  const [tempIngreso, setTempIngreso] = useState<string>('')
  const [tempFinal, setTempFinal] = useState<string>('')
  const [tiempoHoras, setTiempoHoras] = useState<string>('24')
  const [puertaAncho, setPuertaAncho] = useState<string>('')
  const [puertaAlto, setPuertaAlto] = useState<string>('')
  const [aperturas, setAperturas] = useState<Aperturas>('Media')
  const [personas, setPersonas] = useState<string>('0')
  const [horasTrabajo, setHorasTrabajo] = useState<string>('0')
  const [iluminacion, setIluminacion] = useState<Iluminacion>('LED')

  const [step, setStep] = useState(0) // 0 cliente, 1 medidas, 2 frio, 3 pro/resumen
  const [showResult, setShowResult] = useState(false)
  const [historial, setHistorial] = useState(() => getHistorial())
  const [installPrompt, setInstallPrompt] = useState<any>(null)

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => { setVendedorLS(vendedor) }, [vendedor])

  // auto gas/espesor por temp
  useEffect(() => {
    if (tempInt != null) {
      setGas(gasDefault(tempInt))
      if (espesor == null) setEspesor(espesorRecomendado(tempInt))
    }
  }, [tempInt])

  const input: CamaraInput = useMemo(() => ({
    largo: largo ? parseFloat(largo.replace(',', '.')) : null,
    ancho: ancho ? parseFloat(ancho.replace(',', '.')) : null,
    alto: alto ? parseFloat(alto.replace(',', '.')) : null,
    tempInterior: tempInt,
    tempExterior: tempExt,
    espesor,
    pisoAislado,
    servicio,
    gas,
    producto,
    cantidadTotal: cantidadTotal ? parseFloat(cantidadTotal) : null,
    ingresoKgDia: ingresoKgDia ? parseFloat(ingresoKgDia) : null,
    tempIngreso: tempIngreso ? parseFloat(tempIngreso) : null,
    tempFinal: tempFinal ? parseFloat(tempFinal) : null,
    tiempoHoras: tiempoHoras ? parseFloat(tiempoHoras) : null,
    puertaAncho: puertaAncho ? parseFloat(puertaAncho) : null,
    puertaAlto: puertaAlto ? parseFloat(puertaAlto) : null,
    aperturas,
    personas: personas ? parseInt(personas) : null,
    horasTrabajo: horasTrabajo ? parseFloat(horasTrabajo) : null,
    iluminacion,
  }), [largo, ancho, alto, tempInt, tempExt, espesor, pisoAislado, servicio, gas, producto, cantidadTotal, ingresoKgDia, tempIngreso, tempFinal, tiempoHoras, puertaAncho, puertaAlto, aperturas, personas, horasTrabajo, iluminacion])

  const result = useMemo(() => calc(input), [input])

  const canCalc = useMemo(() => {
    return cliente.trim().length >= 2 && input.largo != null && input.ancho != null && input.alto != null && tempInt != null
  }, [cliente, input, tempInt])

  const handleCalc = () => {
    if (!canCalc) return
    setShowResult(true)
    // guardar historial
    const item = {
      id: Date.now().toString(),
      fecha: new Date().toISOString(),
      cliente: cliente.trim(),
      tel: tel.trim() || undefined,
      vendedor: vendedor.trim() || undefined,
      input,
      hp: result.hpFinal,
    }
    pushHistorial(item as any)
    setHistorial(getHistorial())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleShare = async () => {
    const text = `Hola ${cliente || 'cliente'}! Te paso estimado cámara frigorífica:\n• Medidas: ${input.largo}x${input.ancho}x${input.alto} m (${result.volumen} m³)\n• ${input.tempInterior}°C interior / ${input.tempExterior ?? '-'}°C exterior\n• Servicio: ${servicio} — ${result.paneles?.tipo ?? ''}\n• *HP recomendado: ${result.hpFinal} HP* (${result.gas})\n• Condensadora: ${result.condensadora}\n• Evaporadora: ${result.evaporadora}\n• Válvula: ${result.valvula} + ${result.tobera}\n• Paneles: ~${result.paneles?.m2Total} m² (${result.paneles?.cantTotal} paneles)\n\nPredimensionamiento orientativo — verificar con carga térmica fabricante.`
    if (tel) {
      const phone = tel.replace(/\D/g, '')
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
    } else if (navigator.share) {
      try { await navigator.share({ title: 'Cálculo Cámara de Frío', text }) } catch {}
    } else {
      await navigator.clipboard.writeText(text)
      alert('Texto copiado al portapapeles')
    }
  }

  const stepDots = [0,1,2].map(i => (
    <div key={i} className={`h-1.5 flex-1 rounded-full transition ${step >= i ? 'bg-cyan-600' : 'bg-slate-200'}`} />
  ))

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-[720px] mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-extrabold text-[16px]">❄</div>
          <div className="flex-1">
            <div className="font-extrabold leading-none text-[15px] tracking-tight">CÁLCULO CÁMARA DE FRÍO</div>
            <div className="text-[11px] text-slate-500 leading-none">Vendedor • estimado rápido + ajuste pro</div>
          </div>
          {installPrompt && (
            <button onClick={() => installPrompt.prompt()} className="text-xs bg-slate-900 text-white px-3 py-2 rounded-full font-semibold">Instalar</button>
          )}
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-4 pb-24">
        {/* Result card (top) */}
        {showResult && result.estado === 'OK' && (
          <div className="mt-4 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-cyan-600 text-white px-4 py-4">
              <div className="text-[11px] tracking-widest opacity-90">RESULTADO ESTIMADO</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold">{result.hpFinal}</span>
                <span className="text-xl font-bold">HP nominal</span>
                <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded-full">{result.gas} • {result.paneles?.tipo}</span>
              </div>
              <div className="text-xs opacity-90 mt-2">
                {result.hpPro != null && result.hpPro !== result.hpBase
                  ? `A ojo: ${result.hpBase} HP → Ajustado: ${result.hpPro} HP → Recomendado ${result.hpFinal} HP`
                  : `Base: ${result.hpBase} HP → Recomendado ${result.hpFinal} HP`}
                {result.qTotal ? ` • Q total ${result.qTotal} kcal/h` : ''}
              </div>
              <div className="text-[11px] opacity-80 mt-1">Volumen {result.volumen} m³ • Sup {result.superficie} m² • Factor x{result.factorServicio}</div>
            </div>

            <div className="p-4 grid gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[11px] font-bold tracking-widest text-slate-500">UNIDAD CONDENSADORA</div>
                  <div className="text-sm font-semibold mt-1">{result.condensadora}</div>
                  <div className="text-xs text-slate-500 mt-1">Capacidad según HP + gas seleccionado</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[11px] font-bold tracking-widest text-slate-500">UNIDAD EVAPORADORA</div>
                  <div className="text-sm font-semibold mt-1">{result.evaporadora}</div>
                  <div className="text-xs text-slate-500 mt-1">Genérica MT/BT según HP</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[11px] font-bold tracking-widest text-slate-500">VÁLVULA + TOBERA</div>
                  <div className="text-sm font-semibold mt-1">{result.valvula}</div>
                  <div className="text-xs font-medium text-cyan-700 mt-1">{result.tobera}</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[11px] font-bold tracking-widest text-slate-500">PANELES</div>
                  <div className="text-sm font-semibold mt-1">{result.paneles?.tipo} — {result.paneles?.m2Total} m²</div>
                  <div className="text-xs text-slate-600 mt-1">Muros {result.paneles?.m2Muros} + Techo {result.paneles?.m2Techo}{result.paneles?.m2Piso ? ` + Piso ${result.paneles?.m2Piso}` : ''} • ~{result.paneles?.cantTotal} paneles</div>
                </div>
              </div>

              {result.qTotal != null && result.qTotal > 0 && (
                <details className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <summary className="text-xs font-bold text-amber-800 cursor-pointer">Desglose térmico Pro (kcal/h)</summary>
                  <div className="grid grid-cols-3 gap-2 text-xs mt-2 text-amber-900">
                    <div>Transm: <b>{result.qTransmision}</b></div>
                    <div>Producto: <b>{result.qProducto}</b></div>
                    <div>Infilt: <b>{result.qInfiltracion}</b></div>
                    <div>Personas: <b>{result.qPersonas}</b></div>
                    <div>Luz: <b>{result.qIluminacion}</b></div>
                    <div>Total: <b>{result.qTotal}</b></div>
                  </div>
                </details>
              )}

              <div className="rounded-xl bg-slate-900 text-white p-3 text-xs leading-relaxed">
                <span className="font-bold">Importante:</span> predimensionamiento orientativo. Verificar con cálculo de carga térmica completa y capacidad del fabricante a Tevap/Tcond reales. R290 requiere equipo certificado.
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => generarPDF({ cliente, tel, ciudad, vendedor, notas, input, result })} className="bg-cyan-600 text-white rounded-xl py-3 font-bold text-sm">Descargar PDF</button>
                <button onClick={handleShare} className="bg-white border border-slate-300 rounded-xl py-3 font-bold text-sm">Compartir WhatsApp</button>
              </div>
              <button onClick={() => setShowResult(false)} className="text-xs text-slate-500 underline">Editar datos</button>
            </div>
          </div>
        )}

        {/* Stepper */}
        <div className="mt-4 flex gap-2 items-center">
          {stepDots}
        </div>
        <div className="flex justify-between text-[10px] tracking-widest font-bold text-slate-400 mt-1">
          <span className={step===0?'text-cyan-700':''}>CLIENTE</span>
          <span className={step===1?'text-cyan-700':''}>MEDIDAS</span>
          <span className={step===2?'text-cyan-700':''}>FRÍO</span>
        </div>

        {/* Cards wizard */}
        <div className="mt-3 space-y-3">
          {/* Paso 0 Cliente */}
          <div className={`rounded-2xl bg-white border p-4 shadow-sm ${step===0?'border-cyan-600 ring-1 ring-cyan-600': 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm">1 — Cliente</h2>
              <span className="text-[11px] bg-slate-100 px-2 py-1 rounded-full">Obligatorio *</span>
            </div>
            <div className="grid gap-3 mt-3">
              <div>
                <FieldLabel req>Nombre del cliente</FieldLabel>
                <input value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Ej: Carnicería San Juan" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Tel / WhatsApp</FieldLabel>
                  <input value={tel} onChange={e=>setTel(e.target.value)} inputMode="tel" placeholder="Ej: 11 5555 0000" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600" />
                </div>
                <div>
                  <FieldLabel>Ciudad / Zona</FieldLabel>
                  <input value={ciudad} onChange={e=>setCiudad(e.target.value)} placeholder="Ej: Córdoba" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Vendedor</FieldLabel>
                  <input value={vendedor} onChange={e=>setVendedorState(e.target.value)} placeholder="Tu nombre" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600" />
                </div>
                <div>
                  <FieldLabel>Notas</FieldLabel>
                  <input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Ej: sin piso aislado" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600" />
                </div>
              </div>
            </div>
            <button onClick={()=>setStep(1)} className="mt-4 w-full bg-slate-900 text-white rounded-xl py-3 font-bold text-sm">Siguiente — Medidas →</button>
          </div>

          {/* Paso 1 Medidas */}
          <div className={`rounded-2xl bg-white border p-4 shadow-sm ${step===1?'border-cyan-600 ring-1 ring-cyan-600': 'border-slate-200'}`} onClick={()=>setStep(1)}>
            <h2 className="font-bold text-sm">2 — Medidas interiores</h2>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <FieldLabel req>Largo (m)</FieldLabel>
                <input value={largo} onChange={e=>setLargo(e.target.value)} inputMode="decimal" placeholder="4.0" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-600" />
              </div>
              <div>
                <FieldLabel req>Ancho (m)</FieldLabel>
                <input value={ancho} onChange={e=>setAncho(e.target.value)} inputMode="decimal" placeholder="3.0" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-600" />
              </div>
              <div>
                <FieldLabel req>Alto (m)</FieldLabel>
                <input value={alto} onChange={e=>setAlto(e.target.value)} inputMode="decimal" placeholder="2.4" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-600" />
              </div>
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="bg-slate-100 px-3 py-2 rounded-full">Vol: <b>{result.volumen ?? '-'} m³</b></span>
              <span className="bg-slate-100 px-3 py-2 rounded-full">Sup: <b>{result.superficie ?? '-'} m²</b></span>
              <span className="bg-cyan-50 text-cyan-700 px-3 py-2 rounded-full border border-cyan-200">60mm MT / 100mm BT</span>
            </div>
            <button onClick={()=>setStep(2)} className="mt-4 w-full bg-slate-900 text-white rounded-xl py-3 font-bold text-sm">Siguiente — Condiciones →</button>
          </div>

          {/* Paso 2 Frío */}
          <div className={`rounded-2xl bg-white border p-4 shadow-sm ${step===2?'border-cyan-600 ring-1 ring-cyan-600': 'border-slate-200'}`} onClick={()=>setStep(2)}>
            <h2 className="font-bold text-sm">3 — Condiciones de frío</h2>
            <div className="grid gap-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel req>Temp interior °C</FieldLabel>
                  <select value={tempInt ?? ''} onChange={e=>setTempInt(e.target.value?parseInt(e.target.value):null)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600">
                    <option value="">Seleccionar</option>
                    {TEMP_INT_OPTS.map(v=><option key={v} value={v}>{v}°C</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Temp exterior máx °C</FieldLabel>
                  <select value={tempExt ?? ''} onChange={e=>setTempExt(e.target.value?parseInt(e.target.value):null)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600">
                    <option value="">Seleccionar</option>
                    {TEMP_EXT_OPTS.map(v=><option key={v} value={v}>{v}°C</option>)}
                  </select>
                  <div className="text-[10px] text-slate-400 mt-1">Si no sabés, dejá 35°C</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Tipo servicio</FieldLabel>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {SERVICIOS.map(s=>(
                      <button key={s} onClick={()=>setServicio(s)} className={`px-2 py-2.5 rounded-xl text-xs font-bold border ${servicio===s?'bg-cyan-600 text-white border-cyan-600':'bg-white border-slate-300'}`}>{s}</button>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Factor x{result.factorServicio}</div>
                </div>
                <div>
                  <FieldLabel>Gas</FieldLabel>
                  <select value={gas} onChange={e=>setGas(e.target.value as Gas)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600">
                    {GASES.map(g=><option key={g} value={g}>{g}{g==='R22'?' (MT)':g==='R404A'?' (BT)':''}</option>)}
                  </select>
                  <div className="text-[10px] text-slate-400 mt-1">Default {gasDefault(tempInt)} según temp</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Espesor aislación</FieldLabel>
                  <select value={espesor ?? ''} onChange={e=>setEspesor(e.target.value?parseInt(e.target.value):null)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600">
                    {ESPESOR_OPTS.map(v=><option key={v} value={v}>{v} mm {v===60?'— MT':v===100?'— BT':''}</option>)}
                  </select>
                  <div className="text-[10px] text-cyan-700 mt-1">Recomendado: {espesorRecomendado(tempInt)} mm</div>
                </div>
                <div>
                  <FieldLabel>Piso aislado</FieldLabel>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button onClick={()=>setPisoAislado(true)} className={`py-3 rounded-xl font-bold text-sm border ${pisoAislado?'bg-cyan-600 text-white border-cyan-600':'bg-white border-slate-300'}`}>Sí</button>
                    <button onClick={()=>setPisoAislado(false)} className={`py-3 rounded-xl font-bold text-sm border ${!pisoAislado?'bg-cyan-600 text-white border-cyan-600':'bg-white border-slate-300'}`}>No</button>
                  </div>
                </div>
              </div>

              {/* Preview HP rápido */}
              <div className="rounded-xl bg-slate-900 text-white p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] tracking-widest opacity-70">HP ESTIMADO (A OJO)</div>
                  <div className="font-extrabold text-lg">{result.hpRecomendado != null ? `${result.hpBase} → ${result.hpRecomendado} HP` : '— HP'}</div>
                  <div className="text-[11px] opacity-70">{tempInt==null?'Elegí temp interior': tempInt>=0?'MT: Vol/12':'BT: Vol/6'} x {result.factorServicio}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] opacity-70">VOL</div>
                  <div className="font-bold">{result.volumen ?? '-'} m³</div>
                </div>
              </div>

              <button
                onClick={handleCalc}
                disabled={!canCalc}
                className={`w-full rounded-xl py-4 font-extrabold text-sm tracking-wide ${canCalc?'bg-cyan-600 text-white shadow':'bg-slate-200 text-slate-400'}`}
              >
                {canCalc ? `CALCULAR — ${result.hpFinal ?? result.hpRecomendado ?? '-'} HP → Ver detalle` : 'Completá cliente + medidas + temp'}
              </button>
              <div className="text-[11px] text-center text-slate-400">Modo rápido listo. Abajo podés afinar con datos pro (opcional).</div>
            </div>
          </div>

          {/* Pro opcional */}
          <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-4">
            <button onClick={()=>setShowPro(!showPro)} className="w-full flex items-center justify-between">
              <span className="font-bold text-sm">Ajuste fino Pro (opcional)</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${showPro?'bg-cyan-600 text-white':'bg-slate-100'}`}>{showPro?'Ocultar':'Mostrar'}</span>
            </button>
            <div className="text-xs text-slate-500 mt-1">Si el cliente da más datos, el HP se ajusta (producto, puerta, personas).</div>
            {showPro && (
              <div className="grid gap-3 mt-4">
                <div>
                  <FieldLabel>Producto</FieldLabel>
                  <select value={producto} onChange={e=>setProducto(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm bg-white">
                    {PRODUCTOS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Cant. total (kg)</FieldLabel>
                    <input value={cantidadTotal} onChange={e=>setCantidadTotal(e.target.value)} inputMode="numeric" placeholder="—" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>Ingreso kg/día</FieldLabel>
                    <input value={ingresoKgDia} onChange={e=>setIngresoKgDia(e.target.value)} inputMode="numeric" placeholder="Ej: 200" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>T° ingreso °C</FieldLabel>
                    <input value={tempIngreso} onChange={e=>setTempIngreso(e.target.value)} inputMode="decimal" placeholder="20" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>T° final °C</FieldLabel>
                    <input value={tempFinal} onChange={e=>setTempFinal(e.target.value)} inputMode="decimal" placeholder="-18" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>Tiempo (h)</FieldLabel>
                    <input value={tiempoHoras} onChange={e=>setTiempoHoras(e.target.value)} inputMode="numeric" placeholder="24" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Puerta ancho (m)</FieldLabel>
                    <input value={puertaAncho} onChange={e=>setPuertaAncho(e.target.value)} inputMode="decimal" placeholder="0.9" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>Puerta alto (m)</FieldLabel>
                    <input value={puertaAlto} onChange={e=>setPuertaAlto(e.target.value)} inputMode="decimal" placeholder="1.9" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>Aperturas</FieldLabel>
                    <select value={aperturas} onChange={e=>setAperturas(e.target.value as Aperturas)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm bg-white">
                      {APERTURAS.map(a=><option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Personas</FieldLabel>
                    <input value={personas} onChange={e=>setPersonas(e.target.value)} inputMode="numeric" placeholder="0" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>Horas trabajo/día</FieldLabel>
                    <input value={horasTrabajo} onChange={e=>setHorasTrabajo(e.target.value)} inputMode="numeric" placeholder="0" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>Iluminación</FieldLabel>
                    <select value={iluminacion} onChange={e=>setIluminacion(e.target.value as Iluminacion)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm bg-white">
                      {ILUMS.map(i=><option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleCalc} disabled={!canCalc} className={`w-full rounded-xl py-3 font-bold text-sm ${canCalc?'bg-cyan-600 text-white':'bg-slate-200 text-slate-400'}`}>Recalcular con ajuste Pro</button>
                {result.qTotal != null && result.qTotal>0 && (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    Q total: <b>{result.qTotal} kcal/h</b> (Transm {result.qTransmision} + Prod {result.qProducto} + Infilt {result.qInfiltracion} + Pers {result.qPersonas} + Luz {result.qIluminacion})
                    {result.hpPro != null && <span> → HP Pro {result.hpPro} → Final {result.hpFinal} HP</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Historial */}
          {historial.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <h3 className="font-bold text-sm">Historial (últimos 10)</h3>
              <div className="mt-2 divide-y divide-slate-100">
                {historial.map(h=>(
                  <div key={h.id} className="py-2 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold">{h.cliente} — {h.hp} HP</div>
                      <div className="text-xs text-slate-500">{new Date(h.fecha).toLocaleString('es-AR')} {h.vendedor ? `• ${h.vendedor}` : ''}</div>
                    </div>
                    <button onClick={()=>{
                      setCliente(h.cliente); setTel(h.tel||''); setVendedorState(h.vendedor||'')
                      // also restore dims?
                      if (h.input.largo) setLargo(String(h.input.largo))
                      if (h.input.ancho) setAncho(String(h.input.ancho))
                      if (h.input.alto) setAlto(String(h.input.alto))
                      if (h.input.tempInterior != null) setTempInt(h.input.tempInterior)
                      window.scrollTo({top:0, behavior:'smooth'})
                    }} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-bold">Cargar</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center text-[11px] text-slate-400 pb-2">
            Predimensionamiento orientativo — verificar con carga térmica y capacidad del fabricante.
          </div>
        </div>
      </main>

      {/* Footer pro */}
      <footer className="max-w-[720px] mx-auto px-4 pb-28">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 md:p-5">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-xs shrink-0">UF</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm leading-none">Creado por {DEV_INFO.nombre}</div>
              <div className="text-xs text-slate-500 mt-1">{DEV_INFO.slogan} • {DEV_INFO.ubicacion}</div>
              <div className="text-xs text-slate-600 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <a href={`mailto:${DEV_INFO.email}`} className="hover:text-cyan-700 underline decoration-slate-300">{DEV_INFO.email}</a>
                <a href={`tel:${DEV_INFO.telefono.replace(/\s/g,'')}`} className="hover:text-cyan-700">{DEV_INFO.telefono}</a>
                <a href={DEV_INFO.web} target="_blank" rel="noreferrer" className="hover:text-cyan-700 font-medium">{DEV_INFO.webLabel} ↗</a>
              </div>
            </div>
            <div className="hidden md:flex flex-col gap-1 text-xs">
              <a href={DEV_INFO.web} target="_blank" rel="noreferrer" className="bg-slate-900 text-white px-3 py-2 rounded-full font-bold text-center">Visitar web</a>
              <a href={`https://wa.me/${DEV_INFO.whatsapp}?text=${encodeURIComponent('Hola '+DEV_INFO.nombre+', vi la app Cálculo Cámara de Frío y quiero contactarte')}`} target="_blank" rel="noreferrer" className="bg-emerald-500 text-white px-3 py-2 rounded-full font-bold text-center">WhatsApp</a>
            </div>
          </div>

          <div className="md:hidden grid grid-cols-2 gap-2 mt-3">
            <a href={DEV_INFO.web} target="_blank" rel="noreferrer" className="bg-slate-900 text-white rounded-xl py-2.5 font-bold text-sm text-center">Visitar web</a>
            <a href={`https://wa.me/${DEV_INFO.whatsapp}`} target="_blank" rel="noreferrer" className="bg-emerald-500 text-white rounded-xl py-2.5 font-bold text-sm text-center">WhatsApp</a>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
            <span>© {new Date().getFullYear()} {APP_INFO.nombre}</span>
            <span>v{APP_INFO.version}</span>
            <a href={DEV_INFO.web} target="_blank" rel="noreferrer" className="hover:text-slate-600">Privacidad</a>
            <a href={DEV_INFO.web} target="_blank" rel="noreferrer" className="hover:text-slate-600">Términos</a>
            <a href={`mailto:${DEV_INFO.email}?subject=Soporte ${APP_INFO.nombre}`} className="hover:text-slate-600">Soporte</a>
            <span className="ml-auto hidden md:inline">Hecho con ❄ + React + PWA</span>
          </div>
          <div className="mt-2 text-[10px] leading-relaxed text-slate-400">
            App interna de predimensionamiento. No reemplaza el cálculo frigorífico profesional ni la selección por capacidad del fabricante. Si encontrás un error, contactá a {DEV_INFO.nombre}.
          </div>
        </div>
        <div className="text-center text-[10px] text-slate-400 mt-3">
          ¿Necesitás una app similar para tu negocio? <a href={DEV_INFO.web} target="_blank" rel="noreferrer" className="text-cyan-700 font-semibold hover:underline">Hablemos →</a>
        </div>
      </footer>

      {/* Bottom bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3">
        <div className="max-w-[720px] mx-auto grid grid-cols-2 gap-2">
          <button onClick={handleCalc} disabled={!canCalc} className={`rounded-xl py-3 font-extrabold text-sm ${canCalc?'bg-cyan-600 text-white':'bg-slate-200 text-slate-400'}`}>
            Calcular HP
          </button>
          <button onClick={()=>{
            if (!result.hpFinal) return alert('Calculá primero')
            generarPDF({ cliente, tel, ciudad, vendedor, notas, input, result })
          }} className="rounded-xl py-3 font-bold text-sm bg-slate-900 text-white">PDF</button>
        </div>
      </div>
    </div>
  )
}
