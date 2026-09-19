import { useEffect, useState, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../lib/supabaseClient'

/**
 * Componente exclusivo de Escaneo QR para el autobús.
 *
 * Flujo:
 * 1. El conductor pulsa "Escanear QR del Autobús" (o abre la cámara).
 * 2. Apunta al QR pegado en el autobús.
 * 3. La app obtiene el autobús y su línea asignada desde Supabase.
 * 4. Muestra en pantalla: Nombre del conductor, Identificador del autobús y la Línea.
 * 5. Permite iniciar la jornada.
 */
export default function EscanerQR({
  conductorInfo,
  autobusSeleccionado,
  onAutobusConfirmado,
  deshabilitado
}) {
  const [escaneando, setEscaneando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const html5QrCodeRef = useRef(null)

  async function detenerCamara() {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop()
        }
        await html5QrCodeRef.current.clear()
      } catch (err) {
        console.warn('Aviso al detener cámara:', err)
      } finally {
        html5QrCodeRef.current = null
      }
    }
    setEscaneando(false)
  }

  useEffect(() => {
    let montado = true
    if (!escaneando) return

    const qrRegionId = 'qr-reader-container'
    const html5QrCode = new Html5Qrcode(qrRegionId)
    html5QrCodeRef.current = html5QrCode

    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } }

    html5QrCode
      .start(
        { facingMode: 'environment' },
        qrConfig,
        async (decodedText) => {
          if (!montado) return
          await detenerCamara()
          procesarQR(decodedText)
        },
        () => {}
      )
      .catch((err) => {
        if (!montado) return
        console.error('Error al abrir la cámara:', err)
        setError('No se pudo acceder a la cámara. Por favor concede los permisos.')
        detenerCamara()
      })

    return () => {
      montado = false
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
              try { html5QrCodeRef.current?.clear() } catch {}
              html5QrCodeRef.current = null
            })
          } else {
            try { html5QrCodeRef.current?.clear() } catch {}
            html5QrCodeRef.current = null
          }
        } catch {
          html5QrCodeRef.current = null
        }
      }
    }
  }, [escaneando])

  async function procesarQR(textoCodigo) {
    if (!textoCodigo) return
    const valor = textoCodigo.trim()
    setCargando(true)
    setError(null)

    try {
      let query = supabase
        .from('autobuses')
        .select('id, identificador, lineas_id, lineas(id, nombre, color_hex)')
        .eq('activo', true)

      const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
      if (esUUID) {
        query = query.eq('id', valor)
      } else {
        query = query.eq('identificador', valor)
      }

      const { data, error: errQuery } = await query.maybeSingle()

      if (errQuery || !data) {
        setError(`Código QR no reconocido. No se encontró el autobús "${valor}".`)
        setCargando(false)
        return
      }

      // Validación estricta: La línea del autobús debe ser la misma línea del conductor
      const lineaConductorId = conductorInfo?.linea_id
      const lineaAutobusId = data?.lineas_id

      if (lineaConductorId && lineaAutobusId && lineaConductorId !== lineaAutobusId) {
        const nombreLineaBus = data.lineas?.nombre || 'otra línea'
        const nombreLineaConductor = conductorInfo?.linea_nombre || 'tu línea asignada'

        setError(
          `⛔ Autobús no autorizado: La unidad "${data.identificador}" pertenece a "${nombreLineaBus}". Tu línea asignada es "${nombreLineaConductor}". Solo puedes iniciar jornada con autobuses de tu propia línea.`
        )
        setCargando(false)
        return
      }

      onAutobusConfirmado(data)
    } catch (err) {
      console.error('Error al procesar QR:', err)
      setError('Error al consultar el autobús en la base de datos.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="card-qr-section">
      {error && (
        <div className="estado estado--error" style={{ marginBottom: '14px' }}>
          {error}
        </div>
      )}

      {/* Si ya se escaneó y confirmó el autobús */}
      {autobusSeleccionado ? (
        <div className="autobus-confirmado-card">
          <div className="autobus-confirmado-icono">🚌</div>
          <div className="autobus-confirmado-info">
            <span className="badge badge--activa" style={{ alignSelf: 'flex-start', marginBottom: '4px' }}>
              ✓ Unidad Verificada
            </span>
            <h3 style={{ margin: '2px 0 4px', fontSize: '1.25rem', color: 'var(--color-primario)' }}>
              {autobusSeleccionado.identificador}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>
              <span
                className="bienvenida-punto"
                style={{ backgroundColor: autobusSeleccionado.lineas?.color_hex || '#94a3b8' }}
              />
              <strong>{autobusSeleccionado.lineas?.nombre || 'Línea del Autobús'}</strong>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              👤 Conductor: <strong>{conductorInfo?.nombre} {conductorInfo?.apellido}</strong>
            </div>
          </div>

          {!deshabilitado && (
            <button
              type="button"
              className="btn-cambiar-bus"
              onClick={() => onAutobusConfirmado(null)}
              title="Volver a escanear"
            >
              🔄 Cambiar
            </button>
          )}
        </div>
      ) : (
        /* Si aún no ha escaneado el QR */
        <div className="qr-box-espera">
          <div className="qr-info-header">
            <div className="qr-icono-header">📷</div>
            <div>
              <strong style={{ fontSize: '16px', color: 'var(--color-texto)' }}>Escanear QR del Autobús</strong>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
                Apunta con tu cámara al código QR pegado en la unidad para habilitar tu jornada.
              </p>
            </div>
          </div>

          {escaneando ? (
            <div className="qr-scanner-wrapper">
              <div id="qr-reader-container" className="qr-video-box"></div>
              <button
                type="button"
                className="btn-cancelar-escaner"
                onClick={detenerCamara}
              >
                ✕ Cancelar Cámara
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                className="btn-escanear-qr"
                disabled={cargando || deshabilitado}
                onClick={() => {
                  setError(null)
                  setEscaneando(true)
                }}
              >
                {cargando ? (
                  <>
                    <span className="estado-spinner"></span> Verificando autobús…
                  </>
                ) : (
                  '📷 Abrir Cámara y Escanear QR'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
